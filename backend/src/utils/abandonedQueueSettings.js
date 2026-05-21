const CrmSetting = require('../models/CrmSetting');
const { isCronJobEffectiveEnabled } = require('./systemCronSettings');

const ABANDONED_SETTINGS_GROUP = 'abandoned_queue';

const ABANDONED_SETTING_KEYS = {
  CART_MIN_AGE_MINUTES: 'abandoned_stage_cart_min_minutes',
  PAYMENT_MIN_AGE_MINUTES: 'abandoned_stage_payment_min_minutes',
  CRON_ENABLED: 'abandoned_cron_enabled',
  CRON_BATCH_SIZE: 'abandoned_cron_batch_size',
  /** Minutes after last activity before the first reminder email (cart stage). */
  REMINDER_FIRST_DELAY_CART_MINUTES: 'abandoned_reminder_first_delay_cart_minutes',
  /** Minutes after last activity before the first reminder email (payment stage). */
  REMINDER_FIRST_DELAY_PAYMENT_MINUTES: 'abandoned_reminder_first_delay_payment_minutes',
  /** CRM `Template` _id (email) used when sending cart-stage abandoned reminders. */
  REMINDER_EMAIL_TEMPLATE_CART_ID: 'abandoned_reminder_email_template_cart_id',
  /** CRM `Template` _id (email) used when sending payment-stage abandoned reminders. */
  REMINDER_EMAIL_TEMPLATE_PAYMENT_ID: 'abandoned_reminder_email_template_payment_id',
  /** CRM cron: send abandoned reminder emails from CRM (requires SMTP). */
  REMINDER_CRON_ENABLED: 'abandoned_reminder_cron_enabled',
  REMINDER_CRON_BATCH_SIZE: 'abandoned_reminder_cron_batch_size',
  REMINDER_MAX_PER_ROW: 'abandoned_reminder_max_per_row',
  REMINDER_REPEAT_INTERVAL_HOURS: 'abandoned_reminder_repeat_interval_hours',
  /** Minutes after the last CRM reminder before a row may become a lead (0 = no extra wait). */
  LEAD_CREATE_GRACE_AFTER_REMINDER_MINUTES: 'abandoned_lead_create_grace_after_reminder_minutes',
  /**
   * When true, lead-creation cron only picks rows that have received the max CRM reminder count.
   * When false, eligible rows may become leads from queue age alone (see lead cron cooldown).
   */
  LEAD_CREATE_AFTER_MAX_REMINDERS: 'abandoned_lead_create_after_max_reminders',
};

/** Not shown on Abandoned → Settings (cron toggles live under Settings → Crons; min ages use code defaults if unset). */
const ABANDONED_SETTINGS_HIDDEN_FROM_UI = new Set([
  ABANDONED_SETTING_KEYS.CRON_ENABLED,
  ABANDONED_SETTING_KEYS.REMINDER_CRON_ENABLED,
  ABANDONED_SETTING_KEYS.CART_MIN_AGE_MINUTES,
  ABANDONED_SETTING_KEYS.PAYMENT_MIN_AGE_MINUTES,

]);

const DEFAULT_ABANDONED_SETTINGS = [
  {
    key: ABANDONED_SETTING_KEYS.CRON_BATCH_SIZE,
    value: '20',
    type: 'number',
    label: 'Cron batch size',
    description: 'Maximum abandoned queue rows processed per cron run.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_FIRST_DELAY_CART_MINUTES,
    value: '1440',
    type: 'number',
    label: 'Cart — wait before first reminder (minutes)',
    description:
      'How long after the last cart update before Importerr may send the first abandoned-cart reminder email (when CRM is connected). Example: 1440 = 24 hours.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_FIRST_DELAY_PAYMENT_MINUTES,
    value: '60',
    type: 'number',
    label: 'Payment — wait before first reminder (minutes)',
    description:
      'How long after the last checkout snapshot update before Importerr may send the first abandoned-payment reminder email (when CRM is connected).',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_EMAIL_TEMPLATE_CART_ID,
    value: '',
    type: 'string',
    label: 'Abandoned cart — email template',
    description:
      'Select a CRM email template for cart-stage abandoned reminder emails (subject + body). Leave empty to use platform defaults.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_EMAIL_TEMPLATE_PAYMENT_ID,
    value: '',
    type: 'string',
    label: 'Abandoned payment — email template',
    description:
      'Select a CRM email template for payment-stage abandoned reminder emails. Leave empty to use platform defaults.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_CRON_BATCH_SIZE,
    value: '25',
    type: 'number',
    label: 'Reminder cron — batch size',
    description: 'Maximum queue rows evaluated per reminder cron run.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_MAX_PER_ROW,
    value: '3',
    type: 'number',
    label: 'Max CRM reminder emails per queue row',
    description: 'Stops sending further reminders for the same abandoned row after this many sends.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.REMINDER_REPEAT_INTERVAL_HOURS,
    value: '72',
    type: 'number',
    label: 'Hours between CRM reminder emails',
    description: 'Minimum time after the previous send before the next reminder for the same row.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.LEAD_CREATE_AFTER_MAX_REMINDERS,
    value: 'true',
    type: 'boolean',
    label: 'Create lead only after max reminder emails',
    description:
      'When enabled, lead creation waits until the row has received the maximum number of CRM reminder emails (see “Max CRM reminder emails per queue row” in the reminder section). Can be combined with the wait-minutes setting below.',
    group: ABANDONED_SETTINGS_GROUP,
  },
  {
    key: ABANDONED_SETTING_KEYS.LEAD_CREATE_GRACE_AFTER_REMINDER_MINUTES,
    value: '2880',
    type: 'number',
    label: 'Wait after last CRM reminder before creating a lead (minutes)',
    description:
      'After the last reminder email is sent, wait at least this many minutes before the row is eligible for lead creation (approximates “no reply”). Set to 0 to skip this wait. When “Create lead only after max reminder emails” is on, this delay starts after the final (max) reminder is sent.',
    group: ABANDONED_SETTINGS_GROUP,
  },
];

const parseSettingNumber = (raw, fallback = 0) => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
};

const ensureAbandonedQueueSettings = async () => {
  for (const def of DEFAULT_ABANDONED_SETTINGS) {
    await CrmSetting.updateOne({ key: def.key }, { $setOnInsert: def }, { upsert: true });
  }
};

const getAbandonedQueueMinAgeMinutes = async () => {
  await ensureAbandonedQueueSettings();
  const keys = [
    ABANDONED_SETTING_KEYS.CART_MIN_AGE_MINUTES,
    ABANDONED_SETTING_KEYS.PAYMENT_MIN_AGE_MINUTES,
  ];
  const rows = await CrmSetting.find({ key: { $in: keys } }).lean();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    cart: parseSettingNumber(byKey.get(ABANDONED_SETTING_KEYS.CART_MIN_AGE_MINUTES), 30),
    payment: parseSettingNumber(byKey.get(ABANDONED_SETTING_KEYS.PAYMENT_MIN_AGE_MINUTES), 15),
  };
};

const getAbandonedQueueCronSettings = async () => {
  await ensureAbandonedQueueSettings();
  const row = await CrmSetting.findOne({ key: ABANDONED_SETTING_KEYS.CRON_BATCH_SIZE }).lean();
  const enabled = await isCronJobEffectiveEnabled('abandoned_queue_lead');
  const batchSize = Math.min(100, Math.max(1, parseSettingNumber(row?.value, 20)));
  return { enabled, batchSize };
};

const getAbandonedReminderEmailTemplateIds = async () => {
  await ensureAbandonedQueueSettings();
  const keys = [
    ABANDONED_SETTING_KEYS.REMINDER_EMAIL_TEMPLATE_CART_ID,
    ABANDONED_SETTING_KEYS.REMINDER_EMAIL_TEMPLATE_PAYMENT_ID,
  ];
  const rows = await CrmSetting.find({ key: { $in: keys } }).lean();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    cartTemplateId: String(byKey.get(ABANDONED_SETTING_KEYS.REMINDER_EMAIL_TEMPLATE_CART_ID) || '').trim(),
    paymentTemplateId: String(
      byKey.get(ABANDONED_SETTING_KEYS.REMINDER_EMAIL_TEMPLATE_PAYMENT_ID) || ''
    ).trim(),
  };
};

const getAbandonedReminderFirstDelayMinutes = async () => {
  await ensureAbandonedQueueSettings();
  const keys = [
    ABANDONED_SETTING_KEYS.REMINDER_FIRST_DELAY_CART_MINUTES,
    ABANDONED_SETTING_KEYS.REMINDER_FIRST_DELAY_PAYMENT_MINUTES,
  ];
  const rows = await CrmSetting.find({ key: { $in: keys } }).lean();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    cartFirstDelayMinutes: parseSettingNumber(
      byKey.get(ABANDONED_SETTING_KEYS.REMINDER_FIRST_DELAY_CART_MINUTES),
      1440
    ),
    paymentFirstDelayMinutes: parseSettingNumber(
      byKey.get(ABANDONED_SETTING_KEYS.REMINDER_FIRST_DELAY_PAYMENT_MINUTES),
      60
    ),
  };
};

const getAbandonedReminderCronSettings = async () => {
  await ensureAbandonedQueueSettings();
  const keys = [
    ABANDONED_SETTING_KEYS.REMINDER_CRON_BATCH_SIZE,
    ABANDONED_SETTING_KEYS.REMINDER_MAX_PER_ROW,
    ABANDONED_SETTING_KEYS.REMINDER_REPEAT_INTERVAL_HOURS,
  ];
  const rows = await CrmSetting.find({ key: { $in: keys } }).lean();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const enabled = await isCronJobEffectiveEnabled('abandoned_reminder_email');
  return {
    enabled,
    batchSize: Math.min(
      200,
      Math.max(1, parseSettingNumber(byKey.get(ABANDONED_SETTING_KEYS.REMINDER_CRON_BATCH_SIZE), 25))
    ),
    maxPerRow: Math.min(
      20,
      Math.max(1, parseSettingNumber(byKey.get(ABANDONED_SETTING_KEYS.REMINDER_MAX_PER_ROW), 3))
    ),
    repeatIntervalHours: Math.max(
      1,
      parseSettingNumber(byKey.get(ABANDONED_SETTING_KEYS.REMINDER_REPEAT_INTERVAL_HOURS), 72)
    ),
  };
};

const truthySetting = (raw, fallback = false) =>
  ['true', '1', 'yes', 'on'].includes(String(raw ?? (fallback ? 'true' : 'false')).toLowerCase());

/** Whether lead cron requires crmReminderCount >= maxPerRow before creating a lead. */
const getLeadCreateRequiresMaxReminders = async () => {
  await ensureAbandonedQueueSettings();
  const row = await CrmSetting.findOne({ key: ABANDONED_SETTING_KEYS.LEAD_CREATE_AFTER_MAX_REMINDERS }).lean();
  if (row) {
    return truthySetting(row.value, true);
  }
  return true;
};

const getLeadCreateGraceAfterReminderMinutes = async () => {
  await ensureAbandonedQueueSettings();
  const row = await CrmSetting.findOne({
    key: ABANDONED_SETTING_KEYS.LEAD_CREATE_GRACE_AFTER_REMINDER_MINUTES,
  }).lean();
  return parseSettingNumber(row?.value, 2880);
};

module.exports = {
  ABANDONED_SETTINGS_GROUP,
  ABANDONED_SETTING_KEYS,
  DEFAULT_ABANDONED_SETTINGS,
  ensureAbandonedQueueSettings,
  getAbandonedQueueMinAgeMinutes,
  getAbandonedQueueCronSettings,
  getAbandonedReminderCronSettings,
  getAbandonedReminderEmailTemplateIds,
  getAbandonedReminderFirstDelayMinutes,
  getLeadCreateRequiresMaxReminders,
  getLeadCreateGraceAfterReminderMinutes,
  parseSettingNumber,
  ABANDONED_SETTINGS_HIDDEN_FROM_UI,
};

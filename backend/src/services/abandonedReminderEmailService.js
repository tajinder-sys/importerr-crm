const Template = require('../models/Template');
const CrmAbandonedLead = require('../models/CrmAbandonedLead');
const EmailService = require('./EmailService');
const {
  getAbandonedReminderCronSettings,
  getAbandonedReminderEmailTemplateIds,
  getAbandonedReminderFirstDelayMinutes,
} = require('../utils/abandonedQueueSettings');
const logger = require('../utils/logger');

const escapeHtml = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const storefrontBase = () =>
  String(process.env.IMPORTERR_STORE_URL || process.env.FRONTEND_URL || 'https://importerr.com').replace(/\/$/, '');

const buildPlaceholderData = (row) => {
  const ctaUrl =
    row.stage === 'payment' ? `${storefrontBase()}/checkout/address` : `${storefrontBase()}/checkout/cart`;
  return {
    name: escapeHtml(row.name || 'there'),
    email: escapeHtml(row.email || ''),
    phone: escapeHtml(row.phone || ''),
    stage: row.stage === 'payment' ? 'Payment' : 'Cart',
    cartValue: String(Number(row.cartValue) || 0),
    cta_url: ctaUrl,
    year: String(new Date().getFullYear()),
  };
};

const applyCommonPlaceholders = (subject, body, data) => {
  let s = String(subject || '');
  let b = String(body || '');
  Object.entries(data).forEach(([k, v]) => {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
    s = s.replace(re, v);
    b = b.replace(re, v);
  });
  return { subject: s, body: b };
};

const renderFromTemplate = (template, row) => {
  const data = buildPlaceholderData(row);
  let { subject, body } = applyCommonPlaceholders(template.subject || '', template.body || '', data);
  if (Array.isArray(template.placeholders) && template.placeholders.length) {
    const raw = {
      name: row.name || 'there',
      email: row.email || '',
      phone: row.phone || '',
      stage: row.stage === 'payment' ? 'Payment' : 'Cart',
      cartValue: String(Number(row.cartValue) || 0),
      cta_url: data.cta_url,
      year: data.year,
    };
    const merged = EmailService.replacePlaceholders({ ...template, subject, body }, raw);
    subject = merged.subject;
    body = merged.body;
  }
  return { subject, body };
};

const isEligibleForReminder = (row, delays, cronCfg, templateIds, now) => {
  if (!row?.email || !String(row.email).trim()) return false;
  const delayMin = row.stage === 'payment' ? delays.paymentFirstDelayMinutes : delays.cartFirstDelayMinutes;
  const lastActivity = new Date(row.updatedAt || row.lastSyncedAt || 0).getTime();
  if (!lastActivity || now - lastActivity < delayMin * 60_000) return false;

  const count = Number(row.crmReminderCount) || 0;
  if (count >= cronCfg.maxPerRow) return false;

  const templateId =
    row.stage === 'payment' ? templateIds.paymentTemplateId : templateIds.cartTemplateId;
  if (!templateId) return false;

  if (count === 0) return true;
  const last = row.lastCrmReminderSentAt ? new Date(row.lastCrmReminderSentAt).getTime() : 0;
  if (!last) return true;
  const repeatMs = cronCfg.repeatIntervalHours * 3600_000;
  return now - last >= repeatMs;
};

/**
 * Sends CRM abandoned reminder emails for open queue rows (template required per stage).
 */
const processAbandonedReminderEmailBatch = async () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { skipped: true, reason: 'smtp_not_configured', sent: 0, failed: 0, scanned: 0 };
  }

  const cronCfg = await getAbandonedReminderCronSettings();
  if (!cronCfg.enabled) {
    return { skipped: true, reason: 'cron_disabled', sent: 0, failed: 0, scanned: 0 };
  }

  const delays = await getAbandonedReminderFirstDelayMinutes();
  const templateIds = await getAbandonedReminderEmailTemplateIds();

  const candidates = await CrmAbandonedLead.find({
    status: 'open',
    email: { $exists: true, $nin: ['', null] },
  })
    .sort({ updatedAt: 1 })
    .limit(Math.min(500, cronCfg.batchSize * 4))
    .lean();

  const now = Date.now();
  const toTry = candidates.filter((row) => isEligibleForReminder(row, delays, cronCfg, templateIds, now)).slice(
    0,
    cronCfg.batchSize
  );

  let sent = 0;
  let failed = 0;

  for (const row of toTry) {
    const templateId =
      row.stage === 'payment' ? templateIds.paymentTemplateId : templateIds.cartTemplateId;
    const template = await Template.findById(templateId).lean();
    if (!template || template.type !== 'email') {
      continue;
    }

    const { subject, body } = renderFromTemplate(template, row);
    if (!subject.trim() || !body.trim()) {
      continue;
    }

    const prevCount = Number(row.crmReminderCount) || 0;
    try {
      await EmailService.sendHtmlEmail({
        to: String(row.email).trim(),
        subject: subject.trim(),
        html: body,
        templateId: template._id,
        metadata: { referenceId: String(row._id) },
      });

      const res = await CrmAbandonedLead.updateOne(
        {
          _id: row._id,
          status: 'open',
          crmReminderCount: prevCount,
        },
        {
          $set: { lastCrmReminderSentAt: new Date() },
          $inc: { crmReminderCount: 1 },
        }
      );
      if (res.modifiedCount) {
        sent += 1;
        logger.info(`[AbandonedReminderCron] sent to ${row.email} queue=${row._id} stage=${row.stage}`);
      }
    } catch (err) {
      failed += 1;
      logger.warn(`[AbandonedReminderCron] send failed queue=${row._id}: ${err.message}`);
    }
  }

  if (sent || failed) {
    logger.info('[AbandonedReminderCron] batch', { sent, failed, scanned: toTry.length });
  }

  return { sent, failed, scanned: toTry.length };
};

module.exports = {
  processAbandonedReminderEmailBatch,
};

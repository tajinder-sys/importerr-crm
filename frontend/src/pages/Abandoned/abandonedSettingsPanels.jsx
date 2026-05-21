import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Play, Workflow } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { ROUTE_PATHS } from '../../routes/paths';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import Button from '../../components/common/ui/Button';
import Snackbar from '../../components/common/ui/Snackbar';
import SearchableSelect from '../../components/common/ui/SearchableSelect';
import ToggleSwitch from '../../components/common/ui/ToggleSwitch';
import Input from '../../components/common/ui/Input';

const REMINDER_PREFIX = 'abandoned_reminder_';

const REMINDER_EXCLUDED_KEYS = new Set(['abandoned_reminder_cron_enabled']);

const REMINDER_FLOW_ORDER = [
  'abandoned_reminder_first_delay_cart_minutes',
  'abandoned_reminder_first_delay_payment_minutes',
  'abandoned_reminder_email_template_cart_id',
  'abandoned_reminder_email_template_payment_id',
  'abandoned_reminder_cron_batch_size',
  'abandoned_reminder_max_per_row',
  'abandoned_reminder_repeat_interval_hours',
];

const LEAD_AUTOMATION_ORDER = [
  'abandoned_cron_batch_size',
  'abandoned_lead_create_after_max_reminders',
  'abandoned_lead_create_grace_after_reminder_minutes',
];

function sortByKeyOrder(settings, order) {
  const rank = (k) => {
    const i = order.indexOf(k);
    return i === -1 ? 9999 : i;
  };
  return [...(settings || [])].sort((a, b) => rank(a.key) - rank(b.key));
}

export function partitionAbandonedSettings(settings) {
  const list = settings || [];
  const reminderFlow = sortByKeyOrder(
    list.filter(
      (s) =>
        String(s.key || '').startsWith(REMINDER_PREFIX) && !REMINDER_EXCLUDED_KEYS.has(s.key)
    ),
    REMINDER_FLOW_ORDER
  );
  const leadAutomation = sortByKeyOrder(
    list.filter((s) => LEAD_AUTOMATION_ORDER.includes(s.key)),
    LEAD_AUTOMATION_ORDER
  );
  return { reminderFlow, leadAutomation };
}

function useDraftFromSettings(settings) {
  const [draft, setDraft] = useState({});
  useEffect(() => {
    const next = {};
    (settings || []).forEach((s) => {
      next[s.key] = s.value ?? '';
    });
    setDraft(next);
  }, [settings]);
  return [draft, setDraft];
}

function templateSelectOptions(emailTemplates) {
  return [
    { value: '', label: 'None (Importerr / platform default)' },
    ...(emailTemplates || []).map((t) => ({
      value: String(t._id),
      label: [t.name, t.subject ? t.subject.slice(0, 56) + (t.subject.length > 56 ? '…' : '') : '']
        .filter(Boolean)
        .join(' — '),
    })),
  ];
}

function isTemplateSettingKey(key) {
  return String(key || '').includes('email_template');
}

export function AbandonedReminderFlowSettings({ settings, emailTemplates, onSaved }) {
  const [draft, setDraft] = useDraftFromSettings(settings);
  const [saving, setSaving] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const templateOptions = useMemo(() => templateSelectOptions(emailTemplates), [emailTemplates]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        (settings || []).map((s) =>
          api.put(API_ROUTES.settings.update(s.key), {
            value: draft[s.key] ?? (s.type === 'number' ? '0' : ''),
            type: s.type,
          })
        )
      );
      setSnackbar({ open: true, message: 'Reminder settings saved', type: 'success' });
      onSaved?.();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to save reminder settings',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunReminderBatch = async () => {
    setRunningBatch(true);
    try {
      const res = await api.post(API_ROUTES.settings.systemCronRun('abandoned_reminder_email'));
      const payload = res?.data;
      let message = 'Reminder batch finished';
      if (payload?.skipped) {
        message =
          payload.reason === 'smtp_not_configured'
            ? 'Skipped: configure EMAIL_USER / EMAIL_PASS on the server'
            : payload.reason === 'cron_disabled'
            ? 'Skipped: enable the abandoned reminder job under Settings → Scheduled crons (or set ABANDONED_REMINDER_CRON_ENABLED=true on the server)'
              : `Skipped (${payload.reason || 'unknown'})`;
      } else if (payload && typeof payload.sent === 'number') {
        message = `Sent ${payload.sent}, failed ${payload.failed ?? 0}, scanned ${payload.scanned ?? 0}`;
      }
      setSnackbar({ open: true, message, type: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Reminder batch failed',
        type: 'error',
      });
    } finally {
      setRunningBatch(false);
    }
  };

  if (!settings?.length) return null;

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <UiSectionTitle>Reminder emails (CRM)</UiSectionTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={ROUTE_PATHS.TEMPLATES_EMAIL}
              className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              Manage email templates
            </Link>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              startIcon={<Play className="h-3.5 w-3.5" />}
              loading={runningBatch}
              disabled={runningBatch}
              onClick={() => handleRunReminderBatch()}
            >
              Run reminder batch now
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-5">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            <p className="font-medium text-slate-800 dark:text-slate-200">How this fits together</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                <strong>Wait before first reminder</strong> — minutes after the last cart or checkout activity
                before a row is eligible for the first reminder (Importerr may also send when CRM is connected).
              </li>
              <li>
                <strong>Templates</strong> — CRM email templates used when this server sends reminders (requires SMTP).
              </li>
              <li>
                <strong>Schedule &amp; on/off</strong> — Turn jobs on and set how often they run under{' '}
                <Link
                  to={ROUTE_PATHS.SETTINGS_CRONS}
                  className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
                >
                  Settings → Scheduled crons
                </Link>
                .
              </li>
            </ol>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {settings.map((s) => {
              const isBool = s.type === 'boolean';
              const isNum = s.type === 'number';
              const isTpl = isTemplateSettingKey(s.key);

              if (isBool) {
                return (
                  <div
                    key={s.key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-transparent py-1 sm:col-span-2"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.label || s.key}</span>
                      {s.description ? (
                        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{s.description}</p>
                      ) : null}
                    </div>
                    <ToggleSwitch
                      checked={String(draft[s.key] ?? 'false').toLowerCase() === 'true'}
                      onChange={(v) => setDraft((prev) => ({ ...prev, [s.key]: v ? 'true' : 'false' }))}
                    />
                  </div>
                );
              }

              return (
                <div key={s.key} className="space-y-2">
                  {isTpl ? (
                    <>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.label || s.key}</span>
                      {s.description ? (
                        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{s.description}</p>
                      ) : null}
                      <SearchableSelect
                        name={s.key}
                        value={draft[s.key] ?? ''}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [s.key]: e.target.value }))}
                        options={templateOptions}
                        placeholder="Select template"
                        className="max-w-xl"
                      />
                    </>
                  ) : isNum ? (
                    <Input
                      type="number"
                      label={s.label || s.key}
                      helperText={s.description}
                      min={String(s.key).includes('first_delay') ? 1 : 0}
                      value={draft[s.key] ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [s.key]: e.target.value }))}
                      className="max-w-xl"
                    />
                  ) : (
                    <Input
                      label={s.label || s.key}
                      helperText={s.description}
                      value={draft[s.key] ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [s.key]: e.target.value }))}
                      className="max-w-xl"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!emailTemplates?.length ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              No email templates in CRM yet. Create one under Templates → Email, then select it above.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </>
  );
}

export function AbandonedLeadAutomationSettings({ settings, onSaved }) {
  const [draft, setDraft] = useDraftFromSettings(settings);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        (settings || []).map((s) =>
          api.put(API_ROUTES.settings.update(s.key), {
            value: draft[s.key],
            type: s.type,
          })
        )
      );
      setSnackbar({ open: true, message: 'Lead automation saved', type: 'success' });
      onSaved?.();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Failed to save',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!settings?.length) return null;

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between gap-2 py-4">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 shrink-0 text-slate-500" />
            <UiSectionTitle>Lead creation</UiSectionTitle>
          </div>
          <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5 pb-5">
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Turn lead creation on and set how often it runs under{' '}
            <Link
              to={ROUTE_PATHS.SETTINGS_CRONS}
              className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
            >
              Settings → Scheduled crons
            </Link>
            . The <strong>grace after last CRM reminder</strong> setting delays lead creation until that many minutes have
            passed since the last reminder sent <em>from this CRM</em> — a practical stand-in for “no reply yet.” Set it
            to <strong>0</strong> to create leads from queue age alone (ignoring reminders). If you use a positive grace,
            enable the reminder job on the crons page so rows receive reminders first.
          </p>
          <div className="space-y-4">
            {settings.map((s) => {
              if (s.type === 'boolean') {
                return (
                  <div key={s.key} className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.label || s.key}</span>
                      {s.description ? (
                        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{s.description}</p>
                      ) : null}
                    </div>
                    <ToggleSwitch
                      checked={String(draft[s.key] ?? 'false').toLowerCase() === 'true'}
                      onChange={(v) => setDraft((prev) => ({ ...prev, [s.key]: v ? 'true' : 'false' }))}
                    />
                  </div>
                );
              }
              return (
                <Input
                  key={s.key}
                  type="number"
                  min={0}
                  label={s.label || s.key}
                  helperText={s.description}
                  value={draft[s.key] ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  className="max-w-md"
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </>
  );
}

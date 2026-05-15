import { useCallback, useEffect, useState } from 'react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import Modal from '../common/ui/Modal';
import Button from '../common/ui/Button';

function secondsToDaysDisplay(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return '0';
  return String(Math.round((n / 86400) * 1000) / 1000);
}

/**
 * Admin-only: PATCH SLA override for a lead+stage. Parent controls open state.
 */
export default function StageSlaOverrideModal({
  isOpen,
  onClose,
  leadId,
  stageId,
  referenceAllowedSeconds = 0,
  idPrefix = 'sla-ov',
  onSaved,
  onNotify,
}) {
  const [daysInput, setDaysInput] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof onNotify === 'function') onNotify(message, type);
    },
    [onNotify]
  );

  useEffect(() => {
    if (!isOpen) return;
    setDaysInput(secondsToDaysDisplay(referenceAllowedSeconds));
    setOverrideReason('');
    setFormError('');
  }, [isOpen, referenceAllowedSeconds]);

  const close = useCallback(() => {
    if (saving) return;
    onClose?.();
    setFormError('');
  }, [saving, onClose]);

  const submit = useCallback(async () => {
    if (!leadId || !stageId) return;
    const reason = String(overrideReason || '').trim();
    if (reason.length < 3) {
      setFormError('Enter a reason (at least 3 characters).');
      return;
    }
    const days = parseFloat(String(daysInput).replace(',', '.'));
    if (!Number.isFinite(days) || days < 0 || days > 365) {
      setFormError('Days must be a number between 0 and 365.');
      return;
    }
    const allowedSeconds = Math.min(Math.floor(days * 86400), 365 * 86400);
    setFormError('');
    setSaving(true);
    try {
      const res = await api.patch(API_ROUTES.leads.slaOverride(leadId, stageId), {
        allowedSeconds,
        overrideReason: reason,
      });
      const updated = res?.data;
      if (updated && typeof onSaved === 'function') {
        onSaved(updated);
      }
      notify(res?.message || 'SLA updated', 'success');
      onClose?.();
    } catch (e) {
      const msg =
        typeof e === 'string'
          ? e
          : e?.message ||
            (Array.isArray(e?.errors) ? e.errors.join(', ') : null) ||
            'Failed to update SLA';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [leadId, stageId, daysInput, overrideReason, onSaved, onClose, notify]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Override stage SLA"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save override'}
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Sets the total allowed time for this lead in the <strong>current stage</strong>. Consumed time is not reset.
      </p>
      <div className="space-y-4">
        <div>
          <label
            htmlFor={`${idPrefix}-days`}
            className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            SLA allowance (days)
          </label>
          <input
            id={`${idPrefix}-days`}
            type="number"
            min={0}
            max={365}
            step={0.25}
            value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Stored as seconds (max 365 days). Current: {Number(referenceAllowedSeconds) || 0}s
          </p>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-reason`}
            className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Reason (required)
          </label>
          <textarea
            id={`${idPrefix}-reason`}
            rows={3}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Why is this SLA being changed?"
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
      </div>
    </Modal>
  );
}

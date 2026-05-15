import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, AlertTriangle, Pencil } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import StageSlaOverrideModal from './StageSlaOverrideModal';

function formatCountdown(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '—';
  const abs = Math.abs(Math.floor(totalSeconds));
  const sign = totalSeconds < 0 ? '-' : '';
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${String(s).padStart(2, '0')}s`);
  return sign + parts.join(' ');
}

export default function LeadStageSlaBar({
  leadId,
  stageId,
  isAdmin = false,
  onNotify = null,
}) {
  const [timer, setTimer] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof onNotify === 'function') onNotify(message, type);
    },
    [onNotify]
  );

  const load = useCallback(async () => {
    if (!leadId) return;
    setError('');
    try {
      const res = await api.get(API_ROUTES.leads.stageTimer(leadId));
      setTimer(res?.data ?? null);
      setFetchedAt(Date.now());
    } catch (e) {
      setError(e?.message || 'Could not load SLA timer');
      setTimer(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load, stageId]);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(load, 45000);
    return () => clearInterval(iv);
  }, [load]);

  const openOverrideModal = useCallback(() => {
    if (!timer) return;
    setOverrideOpen(true);
  }, [timer]);

  const handleSaved = useCallback(
    (updated) => {
      setTimer(updated);
      setFetchedAt(Date.now());
    },
    []
  );

  const { label, isOverdue, isActive } = useMemo(() => {
    if (!timer) return { label: '', isOverdue: false, isActive: false };
    let remaining = Number(timer.remainingSeconds) || 0;
    if (timer.isActive && fetchedAt) {
      const elapsedSec = Math.floor((Date.now() - fetchedAt) / 1000);
      remaining -= elapsedSec;
    }
    const overdue = remaining <= 0;
    return {
      label: formatCountdown(remaining),
      isOverdue: overdue || Boolean(timer.isOverdue),
      isActive: Boolean(timer.isActive),
    };
  }, [timer, fetchedAt, tick]);

  if (loading) {
    return (
      <div className="mb-4 h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80" />
    );
  }

  if (error) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        {error}
      </div>
    );
  }

  if (!timer || !stageId) return null;

  const noBudget = Number(timer.allowedSeconds) === 0;

  return (
    <>
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
          isOverdue
            ? 'border-red-200 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/30'
            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOverdue ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <Clock className="h-4 w-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Stage SLA
            </p>
            <p
              className={`text-lg font-mono font-semibold tabular-nums ${
                isOverdue ? 'text-red-700 dark:text-red-300' : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {noBudget ? 'No SLA window (0d follow-up)' : label}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={openOverrideModal}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                title="Override SLA (admin)"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex flex-col items-end gap-0.5">
              {isOverdue && <span className="font-semibold text-red-600 dark:text-red-400">Overdue</span>}
              {!isOverdue && isActive && <span className="text-emerald-600 dark:text-emerald-400">Live</span>}
              {!isOverdue && !isActive && <span className="text-slate-400">Paused</span>}
            </div>
          </div>
        </div>
      </div>

      <StageSlaOverrideModal
        isOpen={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        leadId={leadId}
        stageId={stageId}
        referenceAllowedSeconds={timer.allowedSeconds}
        idPrefix={`sla-bar-${String(leadId)}`}
        onSaved={handleSaved}
        onNotify={notify}
      />
    </>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, AlertTriangle, Pencil, PauseCircle, Infinity } from 'lucide-react';
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

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function ProgressBar({ percent, isOverdue, isActive }) {
  const fill = isOverdue
    ? 'bg-red-500'
    : isActive
    ? 'bg-emerald-500'
    : 'bg-slate-300 dark:bg-slate-600';

  return (
    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-in-out ${fill}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
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

  useEffect(() => { setLoading(true); load(); }, [load, stageId]);

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

  const handleSaved = useCallback((updated) => {
    setTimer(updated);
    setFetchedAt(Date.now());
  }, []);

  const { label, isOverdue, isActive, remaining } = useMemo(() => {
    if (!timer) return { label: '', isOverdue: false, isActive: false, remaining: 0 };
    let rem = Number(timer.remainingSeconds) || 0;
    if (timer.isActive && fetchedAt) {
      rem -= Math.floor((Date.now() - fetchedAt) / 1000);
    }
    const overdue = rem <= 0;
    return {
      label: formatCountdown(rem),
      isOverdue: overdue || Boolean(timer.isOverdue),
      isActive: Boolean(timer.isActive),
      remaining: rem,
    };
  }, [timer, fetchedAt, tick]);

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="mb-4 flex animate-pulse items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
        <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-2 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-700/60" />
        </div>
        <div className="h-6 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  /* ── error state ── */
  if (error) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!timer || !stageId) return null;

  const noBudget = Number(timer.allowedSeconds) === 0;
  const allowed = Number(timer.allowedSeconds) || 1;
  const consumedPercent = isOverdue
    ? 100
    : Math.round(((allowed - remaining) / allowed) * 100);

  /* ── state-driven class sets ── */
  const containerCls = isOverdue
    ? 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20'
    : 'border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-800/80';

  const iconWrapCls = isOverdue
    ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
    : isActive
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';

  const timeCls = isOverdue
    ? 'text-red-700 dark:text-red-400'
    : 'text-slate-900 dark:text-slate-100';

  const StateIcon = isOverdue
    ? AlertTriangle
    : noBudget
    ? Infinity
    : isActive
    ? Clock
    : PauseCircle;

  return (
    <>
      <div
        className={`mb-4 rounded-2xl border px-5 py-4 shadow-sm transition-colors duration-200 ${containerCls}`}
      >
        <div className="flex items-center justify-between gap-4">

          {/* ── left: icon + labels ── */}
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconWrapCls}`}
            >
              <StateIcon className="h-4 w-4" strokeWidth={1.75} />
            </div>

            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Stage SLA
              </p>

              {noBudget ? (
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  No SLA window — 0d follow-up
                </p>
              ) : (
                <p
                  className={`font-mono text-xl font-semibold tabular-nums leading-none tracking-tight ${timeCls}`}
                >
                  {label}
                </p>
              )}
            </div>
          </div>

          {/* ── right: status badge + admin edit ── */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {isOverdue ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </span>
            ) : isActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400">
                <LiveDot />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-700/60 dark:text-slate-400">
                <PauseCircle className="h-3 w-3" />
                Paused
              </span>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={openOverrideModal}
                title="Override SLA (admin)"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-all duration-150 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-400"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── progress bar ── */}
        {!noBudget && (
          <ProgressBar
            percent={consumedPercent}
            isOverdue={isOverdue}
            isActive={isActive}
          />
        )}
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
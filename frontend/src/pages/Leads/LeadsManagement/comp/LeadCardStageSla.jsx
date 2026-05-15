import { useEffect, useMemo, useState, useCallback } from 'react';
import { Clock, AlertTriangle, Pencil, PauseCircle, Infinity } from 'lucide-react';
import api from '../../../../utils/api';
import { API_ROUTES } from '../../../../utils/apiRoutes';
import StageSlaOverrideModal from '../../../../components/leads/StageSlaOverrideModal';

function parseFetchedAt(iso) {
  if (!iso) return Date.now();
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

function formatSlaCompact(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return '—';
  const neg = totalSeconds < 0;
  const abs = Math.abs(Math.floor(totalSeconds));
  const prefix = neg ? '-' : '';
  if (abs >= 86400) {
    const d = Math.floor(abs / 86400);
    const h = Math.floor((abs % 86400) / 3600);
    return `${prefix}${d}d ${h}h`;
  }
  if (abs >= 3600) {
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return `${prefix}${h}h ${m}m`;
  }
  const m = Math.floor(abs / 60);
  const sec = abs % 60;
  return `${prefix}${m}m ${String(sec).padStart(2, '0')}s`;
}

/** Animated live dot shown next to the "Live" badge */
function LiveDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

/**
 * Compact SLA strip for kanban / list lead cards.
 * Uses `lead.stageTimer` from GET /leads.
 * Admins can override SLA; onPointerDown on edit button prevents drag start.
 */
export default function LeadCardStageSla({
  timer,
  leadId,
  stageId,
  slaAdmin = false,
  onStageTimerUpdated,
  onNotify,
}) {
  const [tick, setTick] = useState(0);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [refAllowedSeconds, setRefAllowedSeconds] = useState(
    () => Number(timer?.allowedSeconds) || 0
  );

  const fetchedAt = parseFetchedAt(timer?.fetchedAt);

  useEffect(() => {
    if (!overrideOpen) {
      setRefAllowedSeconds(Number(timer?.allowedSeconds) || 0);
    }
  }, [timer, overrideOpen]);

  useEffect(() => {
    if (!timer?.isActive) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer?.isActive]);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof onNotify === 'function') onNotify(message, type);
    },
    [onNotify]
  );

  const openOverride = useCallback(
    async (e) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      if (!leadId || !stageId) return;
      let allowed = Number(timer?.allowedSeconds) || 0;
      try {
        const res = await api.get(API_ROUTES.leads.stageTimer(leadId));
        const fresh = res?.data;
        if (fresh && typeof fresh === 'object') {
          allowed = Number(fresh.allowedSeconds) || 0;
          const merged = { ...fresh, fetchedAt: new Date().toISOString() };
          if (typeof onStageTimerUpdated === 'function') {
            onStageTimerUpdated(leadId, merged);
          }
        }
      } catch {
        /* keep list timer if GET fails */
      }
      setRefAllowedSeconds(allowed);
      setOverrideOpen(true);
    },
    [leadId, stageId, timer, onStageTimerUpdated]
  );

  const handleSaved = useCallback(
    (updated) => {
      if (typeof onStageTimerUpdated === 'function' && updated) {
        onStageTimerUpdated(leadId, { ...updated, fetchedAt: new Date().toISOString() });
      }
    },
    [leadId, onStageTimerUpdated]
  );

  const { label, overdue, live, noBudget } = useMemo(() => {
    if (!timer) return { label: '', overdue: false, live: false, noBudget: false };
    const allowed = Number(timer.allowedSeconds) || 0;
    if (allowed === 0) {
      return { label: 'No SLA window', overdue: false, live: Boolean(timer.isActive), noBudget: true };
    }
    let remaining = Number(timer.remainingSeconds) || 0;
    if (timer.isActive) {
      remaining -= Math.floor((Date.now() - fetchedAt) / 1000);
    }
    const od = remaining <= 0;
    return {
      label: od ? `Overdue · ${formatSlaCompact(remaining)}` : formatSlaCompact(remaining),
      overdue: od,
      live: Boolean(timer.isActive),
      noBudget: false,
    };
  }, [timer, fetchedAt, tick]);

  if (!timer) return null;

  const sid = stageId || timer.stageId;
  const lid = leadId || timer.leadId;
  const showEdit = slaAdmin && lid && sid;

  /* ── strip skin ── */
  const stripCls = overdue && !noBudget
    ? 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/25'
    : noBudget
    ? 'border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20'
    : 'border-slate-200/80 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-800/50';

  /* ── icon ── */
  const IconEl = overdue
    ? AlertTriangle
    : noBudget
    ? Infinity
    : live
    ? Clock
    : PauseCircle;

  const iconCls = overdue
    ? 'text-red-500 dark:text-red-400'
    : noBudget
    ? 'text-blue-400 dark:text-blue-400'
    : live
    ? 'text-slate-400 dark:text-slate-500'
    : 'text-slate-400 dark:text-slate-600';

  /* ── time text ── */
  const timeCls = overdue
    ? 'text-red-700 dark:text-red-300'
    : noBudget
    ? 'text-blue-700 dark:text-blue-300'
    : 'text-slate-700 dark:text-slate-200';

  return (
    <>
      <div
        className={`mt-2 flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 transition-colors duration-150 ${stripCls}`}
      >
        {/* left: icon + time */}
        <div className="flex min-w-0 items-center gap-1.5">
          <IconEl
            className={`h-3 w-3 flex-shrink-0 ${iconCls}`}
            strokeWidth={1.75}
          />
          <span
            className={`min-w-0 truncate font-mono text-[10px] font-semibold tabular-nums ${timeCls}`}
            title="Time remaining in this pipeline stage (SLA)"
          >
            {noBudget ? label : `${label}`}
          </span>
        </div>

        {/* right: badge + edit */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {/* status badge */}
          {!noBudget && overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-1.5 py-px text-[9px] font-semibold text-red-700 dark:border-red-800/60 dark:bg-red-900/40 dark:text-red-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              Overdue
            </span>
          )}
          {!noBudget && live && !overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[9px] font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400">
              <LiveDot />
              Live
            </span>
          )}
          {!noBudget && !live && !overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-px text-[9px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
              <PauseCircle className="h-2.5 w-2.5" />
              Paused
            </span>
          )}

          {/* admin edit button */}
          {showEdit && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={openOverride}
              title="Override SLA (admin)"
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition-all duration-100 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 active:scale-95 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-400"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      </div>

      {showEdit && (
        <StageSlaOverrideModal
          isOpen={overrideOpen}
          onClose={() => setOverrideOpen(false)}
          leadId={lid}
          stageId={sid}
          referenceAllowedSeconds={refAllowedSeconds}
          idPrefix={`sla-card-${String(lid)}`}
          onSaved={handleSaved}
          onNotify={notify}
        />
      )}
    </>
  );
}
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Clock, AlertTriangle, Pencil } from 'lucide-react';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';
import StageSlaOverrideModal from '../../../components/leads/StageSlaOverrideModal';

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

/**
 * Compact SLA strip for kanban / list lead cards. Uses `lead.stageTimer` from GET /leads.
 * Admins can override SLA (opens modal); use onPointerDown on the edit control to avoid starting drag.
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
  const [refAllowedSeconds, setRefAllowedSeconds] = useState(() => Number(timer?.allowedSeconds) || 0);

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
      return {
        label: 'No SLA window',
        overdue: false,
        live: Boolean(timer.isActive),
        noBudget: true,
      };
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

  return (
    <>
      <div
        className={`mt-2 flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${
          overdue && !noBudget
            ? 'border-red-200/90 bg-red-50/90 dark:border-red-900/50 dark:bg-red-950/25'
            : 'border-slate-100 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/40'
        }`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {overdue ? (
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
          )}
          <span
            className={`min-w-0 truncate font-mono text-[10px] font-semibold tabular-nums ${
              overdue ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'
            }`}
            title="Time remaining in this pipeline stage (SLA)"
          >
            {noBudget ? label : `SLA ${label}`}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {slaAdmin && lid && sid && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={openOverride}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
              title="Override SLA (admin)"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {!noBudget && live && !overdue && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Live
            </span>
          )}
          {!noBudget && !live && !overdue && (
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">Paused</span>
          )}
          {noBudget && (
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">—</span>
          )}
        </div>
      </div>

      {slaAdmin && lid && sid && (
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

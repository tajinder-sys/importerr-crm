import { Clock, AlertTriangle, PauseCircle, CheckCircle2, Shield } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { formatSlaRemaining, formatStageDuration, formatAllowedSla } from '../../utils/formatSlaRemaining';
import { formatDate } from '../../utils/helpers';

const STATUS_META = {
  active: {
    label: 'In progress',
    icon: Clock,
    pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    pill: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
  paused: {
    label: 'Paused',
    icon: PauseCircle,
    pill: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  done: {
    label: 'Completed',
    icon: CheckCircle2,
    pill: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
};

function StageHistoryRow({ row, isLast }) {
  const meta = STATUS_META[row.status] || STATUS_META.paused;
  const Icon = meta.icon;
  const barPct = Math.min(100, row.usagePercent ?? 0);
  const barColor =
    row.status === 'overdue'
      ? 'bg-red-500'
      : row.status === 'active'
        ? 'bg-emerald-500'
        : 'bg-violet-500';

  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-600"
          aria-hidden
        />
      )}
      <div
        className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900"
        style={{ backgroundColor: row.stageColor || '#6B7280' }}
      >
        <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.stageName}</h3>
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Stage {row.stageOrder + 1}
              </span>
              {row.isCurrentStage && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  Final stage
                </span>
              )}
            </div>
            <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', meta.pill)}>
              {meta.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {formatStageDuration(row.timeSpentSeconds)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">time in stage</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400">SLA budget</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {formatAllowedSla(row.allowedSeconds)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Remaining</p>
            <p
              className={cn(
                'font-semibold tabular-nums',
                row.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
              )}
            >
              {formatSlaRemaining(row.remainingSeconds)}
            </p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">SLA used</p>
            <p className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{barPct}%</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Last activity</p>
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {row.lastPausedAt || row.updatedAt
                ? formatDate(row.lastPausedAt || row.updatedAt)
                : '—'}
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${barPct}%` }} />
        </div>

        {row.overriddenByAdmin && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Admin SLA override{row.overrideReason ? `: ${row.overrideReason}` : ''}</span>
          </p>
        )}
      </div>
    </li>
  );
}

export default function LeadStageTimeline({ stages = [], className = '' }) {
  if (!stages.length) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
          className
        )}
      >
        No stage SLA history recorded for this lead yet.
      </div>
    );
  }

  const totalSpent = stages.reduce((s, r) => s + (Number(r.timeSpentSeconds) || 0), 0);

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/90',
        className
      )}
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Stage SLA timeline</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Time spent in each pipeline stage for this lead
          </p>
        </div>
        <div className="rounded-xl bg-violet-50 px-3 py-2 text-right dark:bg-violet-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Total in pipeline
          </p>
          <p className="text-lg font-bold tabular-nums text-violet-900 dark:text-violet-200">
            {formatStageDuration(totalSpent)}
          </p>
        </div>
      </div>
      <ol className="list-none p-0 m-0">
        {stages.map((row, i) => (
          <StageHistoryRow key={String(row.progressId || row.stageId)} row={row} isLast={i === stages.length - 1} />
        ))}
      </ol>
    </div>
  );
}

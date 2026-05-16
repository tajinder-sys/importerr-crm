'use client';

import { useState } from 'react';
import { Clock, AlertTriangle, PauseCircle, CheckCircle2, Shield, ChevronDown, Activity, Calendar } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { formatSlaRemaining, formatStageDuration, formatAllowedSla } from '../../utils/formatSlaRemaining';
import { formatDate } from '../../utils/helpers';

const STATUS_META = {
  active: {
    label: 'In progress',
    icon: Clock,
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  paused: {
    label: 'Paused',
    icon: PauseCircle,
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
  done: {
    label: 'Completed',
    icon: CheckCircle2,
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  },
};

function MetaChip({ icon: Icon, label, value, valueClassName = '' }) {
  return (
    <div className="flex-1 min-w-[90px] rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn('text-[13px] font-semibold text-slate-800 dark:text-slate-100', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function StageAccordionItem({ row, isOpen, onToggle }) {
  const meta = STATUS_META[row.status] || STATUS_META.paused;
  const Icon = meta.icon;
  const pct = Math.min(100, row.usagePercent ?? 0);
  const lastAct = row.lastPausedAt || row.updatedAt;

  return (
    <li className={cn(
      'overflow-hidden rounded-[10px] border bg-white dark:bg-slate-800/90 transition-colors',
      isOpen
        ? 'border-slate-300 dark:border-slate-600'
        : 'border-slate-200/80 dark:border-slate-700'
    )}>

      {/* Trigger */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors',
          isOpen
            ? 'bg-slate-50 dark:bg-slate-700/40'
            : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/20'
        )}
      >
        <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full', meta.dot)} />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
          {row.stageOrder + 1}.
        </span>
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">
          {row.stageName}
        </span>
        {row.isCurrentStage && (
          <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            Current
          </span>
        )}
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', meta.badge)}>
          {meta.label}
        </span>
        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-700 dark:text-slate-200 ml-1">
          {formatStageDuration(row.timeSpentSeconds)}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* SLA mini bar always visible */}
      <div className="h-[2px] bg-slate-100 dark:bg-slate-700">
        <div className={cn('h-full transition-all duration-500', meta.bar)} style={{ width: `${pct}%` }} />
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-3 space-y-2.5">

          {/* Meta chips */}
          <div className="flex flex-wrap gap-1.5">
            <MetaChip icon={Clock} label="Budget" value={formatAllowedSla(row.allowedSeconds)} />
            <MetaChip
              icon={Icon}
              label="Remaining"
              value={formatSlaRemaining(row.remainingSeconds)}
              valueClassName={row.isOverdue ? 'text-red-600 dark:text-red-400' : ''}
            />
            <MetaChip icon={Activity} label="Spent" value={formatStageDuration(row.timeSpentSeconds)} />
            <MetaChip icon={Calendar} label="Last activity" value={lastAct ? formatDate(lastAct) : '—'} />
          </div>

          {/* SLA progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
              <span>SLA used</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">{pct}%</span>
            </div>
            <div className="h-[3px] rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', meta.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Overdue note */}
          {row.isOverdue && (
            <div className="flex items-start gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/25 px-2.5 py-2 text-[11px] text-red-800 dark:text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Exceeded SLA by{' '}
                <strong>{formatStageDuration(Math.abs(row.remainingSeconds))}</strong>
              </span>
            </div>
          )}

          {/* Admin override */}
          {row.overriddenByAdmin && (
            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/25 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-200">
              <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>Admin override</strong>
                {row.overrideReason ? `: ${row.overrideReason}` : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function LeadStageTimeline({ stages = [], className = '' }) {
  const [openIndex, setOpenIndex] = useState(null);
  const toggle = (i) => setOpenIndex((prev) => (prev === i ? null : i));

  if (!stages.length) {
    return (
      <div className={cn(
        'rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
        className
      )}>
        No stage SLA history recorded for this lead yet.
      </div>
    );
  }

  const totalSpent = stages.reduce((s, r) => s + (Number(r.timeSpentSeconds) || 0), 0);

  return (
    <div className={cn(
      'rounded-xl border border-slate-200/90 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/90',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            Stage SLA timeline
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Pipeline stages · {stages.length} total
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Total time
          </p>
          <p className="text-base font-bold tabular-nums text-violet-700 dark:text-violet-300">
            {formatStageDuration(totalSpent)}
          </p>
        </div>
      </div>

      {/* Accordion list */}
      <ol className="list-none p-0 m-0 space-y-1.5">
        {stages.map((row, i) => (
          <StageAccordionItem
            key={String(row.progressId || row.stageId)}
            row={row}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </ol>
    </div>
  );
}
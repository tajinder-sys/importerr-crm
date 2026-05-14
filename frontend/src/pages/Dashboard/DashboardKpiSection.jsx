import {
  Users,
  Phone,
  CheckCircle,
  Activity,
  Percent,
  Layers
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { KpiGridSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardKpiSection({ kpis }) {
  if (kpis.loading) return <KpiGridSkeleton />;
  if (kpis.error) return sectionError(kpis.error);
  const d = kpis.data;
  if (!d) return sectionError('Failed to load KPIs');

  const cards = [
    {
      key: 'total',
      title: 'Total leads',
      value: (d.totalLeads ?? 0).toLocaleString('en-IN'),
      subtitle: 'With pipeline & stage (current filters)',
      icon: Users,
      accent: 'bg-sky-50 dark:bg-sky-900/20',
      iconWrap: 'bg-sky-100 text-sky-700 ring-sky-200/60'
    },
    {
      key: 'wonStage',
      title: 'Won leads',
      value: (d.wonStageLeads ?? 0).toLocaleString('en-IN'),
      subtitle: 'In terminal stage (max order) for their pipeline',
      icon: CheckCircle,
      accent: 'bg-violet-50 dark:bg-violet-900/20',
      iconWrap: 'bg-violet-100 text-violet-700 ring-violet-200/60'
    },
    {
      key: 'share',
      title: 'Conversion',
      value: `${d.wonStageSharePercent ?? 0}%`,
      subtitle: 'Won leads ÷ total leads in view',
      icon: Percent,
      accent: 'bg-primary-50 dark:bg-primary-900/20',
      iconWrap: 'bg-primary-100 text-primary-800 ring-primary-200/60'
    },
    {
      key: 'inProgress',
      title: 'In progress',
      value: (d.inProgressLeads ?? 0).toLocaleString('en-IN'),
      subtitle: 'Not terminal; probability between 0–100% or unset',
      icon: Activity,
      accent: 'bg-amber-50 dark:bg-amber-900/20',
      iconWrap: 'bg-amber-100 text-amber-800 ring-amber-200/60'
    },
    {
      key: 'avgProb',
      title: 'Avg stage probability',
      value: d.avgStageWinProbability != null ? `${d.avgStageWinProbability}%` : '—',
      subtitle: 'Mean of stage % (informational)',
      icon: Layers,
      accent: 'bg-slate-100 dark:bg-slate-700/30',
      iconWrap: 'bg-slate-100 text-slate-700 ring-slate-200/60'
    },
    {
      key: 'zero',
      title: 'Zero-probability stages',
      value: (d.zeroProbabilityLeads ?? 0).toLocaleString('en-IN'),
      subtitle: 'Stages marked 0% probability',
      icon: Phone,
      accent: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60'
    }
  ];

  return (
    <>
      {sectionError(kpis.error)}
      <div className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800',
                'transition-all duration-200 hover:border-violet-200/80 hover:shadow-md dark:hover:border-violet-800/60'
              )}
            >
              <div className={cn('pointer-events-none absolute inset-0 opacity-100', stat.accent)} aria-hidden />
              <div className="relative flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ring-inset',
                    stat.iconWrap
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <p className="mt-1 truncate font-sans text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </p>
                  {stat.subtitle ? (
                    <p className="mt-0.5 font-sans text-xs text-slate-500 dark:text-slate-400">{stat.subtitle}</p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

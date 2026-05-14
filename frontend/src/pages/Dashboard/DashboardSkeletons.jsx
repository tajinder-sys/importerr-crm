import { cn } from '../../utils/helpers';

export const SkeletonBlock = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-700/80', className)} />
);

export const KpiGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-start gap-4">
          <SkeletonBlock className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-36" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ h = 'h-72' }) => (
  <div
    className={cn(
      'rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800',
      h
    )}
  >
    <SkeletonBlock className="mb-3 h-4 w-40" />
    <SkeletonBlock className="h-full min-h-[200px] w-full rounded-xl" />
  </div>
);

export const TasksSectionSkeleton = () => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-10 w-28 rounded-full" />
      ))}
    </div>
  </div>
);

export const RecentListSkeleton = () => (
  <div className="divide-y divide-slate-100 dark:divide-slate-700">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-5 py-3.5">
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-48" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
        <SkeletonBlock className="h-6 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

export const PerformanceTableSkeleton = () => (
  <div className="space-y-3 p-2">
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonBlock key={i} className="h-10 w-full rounded-lg" />
    ))}
  </div>
);

export const PipelineWinRatesSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <SkeletonBlock key={i} className="h-12 w-full rounded-xl" />
    ))}
  </div>
);

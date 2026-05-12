import Skeleton from "../../common/ui/Skeleton";

const RecalcSkeleton = () => (
  <div className="flex flex-col gap-6 py-1">
    {/* Variants skeleton */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {/* Bulk edit bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50/60 to-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[52px_1fr_90px_180px_100px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
          {[52, 80, 40, 100, 60].map((w, i) => (
            <Skeleton key={i} className="h-2.5" style={{ width: w }} />
          ))}
        </div>

        {/* Variant rows */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[52px_1fr_90px_180px_100px] gap-2 items-center px-4 py-3 border-b border-slate-50 last:border-0"
          >
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="h-7 w-14 mx-auto rounded-lg" />
            <Skeleton className="h-7 w-full rounded-lg" />
            <Skeleton className="h-7 w-14 mx-auto rounded-lg" />
          </div>
        ))}
      </div>
    </div>

    {/* Cost factors skeleton */}
    <div>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {/* Header */}
        <div className="grid grid-cols-[1fr_160px_100px] px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          {[80, 60, 48].map((w, i) => (
            <Skeleton key={i} className="h-2.5 ml-auto first:ml-0" style={{ width: w }} />
          ))}
        </div>

        {/* Factor rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_160px_100px] items-center px-4 py-3 border-b border-slate-50 last:border-0"
          >
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-20 ml-auto rounded-md" />
            <Skeleton className="h-4 w-14 ml-auto" />
          </div>
        ))}

        {/* Total row */}
        <div className="grid grid-cols-[1fr_160px_100px] items-center px-4 py-3 bg-slate-50 border-t border-slate-200">
          <Skeleton className="h-3 w-20" />
          <div />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      </div>
    </div>
  </div>
);

export default RecalcSkeleton;
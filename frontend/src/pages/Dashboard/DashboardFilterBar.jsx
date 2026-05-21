import SearchableSelect from '../../components/common/ui/SearchableSelect';
import { Clock, HelpCircle, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { DASHBOARD_PERIOD_OPTIONS } from './dashboardConstants';
import { SkeletonBlock } from './DashboardSkeletons';

const selectBtn =
  'h-9 w-full rounded-lg border-slate-200/90 bg-white px-2.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100';

export default function DashboardFilterBar({
  greeting,
  displayName,
  isAdmin,
  filtersMeta,
  filters,
  setFilters,
  handleFilterChange,
  pipelineOptions,
  stageOptions,
  stagesLoading,
  showStageFilter,
  sourceOptions,
  ownerOptions,
  showOwnerFilter,
  updatedLabel
}) {
  const helpTitle = isAdmin
    ? 'Conversion = share of leads in each pipeline’s last stage (highest order). Not based on legacy lead status.'
    : 'Metrics respect your role: team pipelines, assignments, and active leads only.';

  return (
    <div className="relative z-[100] overflow-visible rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-slate-900/[0.04] backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/80 dark:ring-white/[0.06]">
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        {/* Title row — one tight line */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Dashboard
            </h1>
            <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
              {greeting}, {displayName}
            </span>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title={helpTitle}
              aria-label="How metrics work"
            >
              <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          {updatedLabel ? (
            <span className="flex max-w-full items-center gap-1 truncate font-mono text-[10px] text-slate-400 dark:text-slate-500 sm:text-[11px]">
              <Clock className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">{updatedLabel}</span>
            </span>
          ) : null}
        </div>

        {/* Toolbar — minimal height, wraps on small screens */}
        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
          role="toolbar"
          aria-label="Dashboard filters"
        >
          <div
            className="inline-flex shrink-0 rounded-md border border-slate-200/80 bg-slate-50/90 p-px dark:border-slate-600 dark:bg-slate-800/80"
            role="group"
            aria-label="Date range"
          >
            {DASHBOARD_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, period: option.value }))}
                className={cn(
                  'rounded-[5px] px-2 py-1 font-sans text-[11px] font-semibold tabular-nums transition-colors sm:px-2.5',
                  filters.period === option.value
                    ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <span
            className="hidden h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-600 sm:block"
            aria-hidden
          />

          {filtersMeta.loading ? (
            <>
              <SkeletonBlock className="h-9 min-w-[6.5rem] flex-1 rounded-lg sm:max-w-[10rem]" />
              <SkeletonBlock className="h-9 min-w-[6.5rem] flex-1 rounded-lg sm:max-w-[9rem]" />
              {showOwnerFilter ? (
                <SkeletonBlock className="h-9 min-w-[6.5rem] flex-1 rounded-lg sm:max-w-[9rem]" />
              ) : null}
            </>
          ) : (
            <>
              <SearchableSelect
                name="pipeline"
                value={filters.pipeline}
                onChange={handleFilterChange}
                className="min-w-0 flex-1 basis-[6.5rem] sm:max-w-[11rem] sm:basis-auto"
                buttonClassName={selectBtn}
                dropdownClassName="!min-w-[min(100vw-2rem,18rem)]"
                options={pipelineOptions}
              />
              {showStageFilter ? (
                <SearchableSelect
                  name="stage"
                  value={filters.stage}
                  onChange={handleFilterChange}
                  disabled={stagesLoading}
                  placeholder={stagesLoading ? 'Loading stages…' : 'All stages'}
                  className="min-w-0 flex-1 basis-[6rem] sm:max-w-[10rem] sm:basis-auto"
                  buttonClassName={selectBtn}
                  dropdownClassName="!min-w-[min(100vw-2rem,16rem)]"
                  options={stageOptions}
                />
              ) : null}
              <SearchableSelect
                name="source"
                value={filters.source}
                onChange={handleFilterChange}
                className="min-w-0 flex-1 basis-[6rem] sm:max-w-[9.5rem] sm:basis-auto"
                buttonClassName={selectBtn}
                dropdownClassName="!min-w-[min(100vw-2rem,16rem)]"
                options={sourceOptions}
              />
              {showOwnerFilter ? (
                <SearchableSelect
                  name="owner"
                  value={filters.owner}
                  onChange={handleFilterChange}
                  className="min-w-0 flex-1 basis-[6rem] sm:max-w-[9.5rem] sm:basis-auto"
                  buttonClassName={selectBtn}
                  dropdownClassName="!min-w-[min(100vw-2rem,16rem)]"
                  options={ownerOptions}
                />
              ) : null}
            </>
          )}

          <button
            type="button"
            title="Reset filters"
            aria-label="Reset filters"
            onClick={() =>
              setFilters({ period: 'all', source: 'all', pipeline: 'all', stage: 'all', owner: 'all' })
            }
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-violet-500/40 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {filtersMeta.error ? (
          <p className="rounded-md border border-rose-200/80 bg-rose-50/80 px-2 py-1 text-[11px] text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            {filtersMeta.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

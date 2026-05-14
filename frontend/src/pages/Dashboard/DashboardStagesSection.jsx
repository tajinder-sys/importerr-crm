import { useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import { CardSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardStagesSection({ stages }) {
  const { pipelines, maxCount } = useMemo(() => {
    const list = stages.data?.pipelines || [];
    let max = 0;
    for (const pl of list) {
      for (const s of pl.stages || []) {
        if (s.count > max) max = s.count;
      }
    }
    return { pipelines: list, maxCount: max || 1 };
  }, [stages.data]);

  const totalStages = useMemo(
    () => pipelines.reduce((n, pl) => n + (pl.stages?.length || 0), 0),
    [pipelines]
  );

  return (
    <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div>
          <UiSectionTitle>Pipeline by stage</UiSectionTitle>
          <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
            Stages grouped under each pipeline (lead counts in your current filters).
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[18rem] max-h-[28rem]">
          {stages.loading ? (
            <CardSkeleton h="min-h-[18rem]" />
          ) : stages.error ? (
            sectionError(stages.error)
          ) : pipelines.length === 0 || totalStages === 0 ? (
            <div className="flex min-h-[18rem] items-center justify-center font-sans text-sm text-slate-500">
              No stages in view.
            </div>
          ) : (
            <div className="max-h-[28rem] space-y-5 overflow-y-auto pr-1">
              {pipelines.map((pl) => (
                <div
                  key={String(pl.pipelineId ?? pl.pipelineName)}
                  className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm dark:border-slate-600 dark:from-slate-800 dark:to-slate-900/60"
                >
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200/80 pb-2.5 dark:border-slate-600">
                    <h3 className="font-sans text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {pl.pipelineName}
                    </h3>
                    <span className="font-sans text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {(pl.stages || []).length} stage{(pl.stages || []).length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="space-y-3.5">
                    {(pl.stages || []).map((s) => {
                      const barPct = maxCount ? Math.min(100, Math.max(6, (s.count / maxCount) * 100)) : 6;
                      const fill =
                        s.color && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(String(s.color))
                          ? s.color
                          : '#64748b';
                      return (
                        <li key={String(s.stageId)}>
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:max-w-[44%]">
                              <span className="truncate font-sans text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">
                                {s.name || '—'}
                                {s.probabilityPercent != null ? (
                                  <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                                    ({s.probabilityPercent}%)
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                ord {s.order ?? '—'}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700">
                                <div
                                  className="h-full rounded-full opacity-90 transition-[width] duration-300"
                                  style={{
                                    width: `${barPct}%`,
                                    backgroundColor: fill,
                                  }}
                                />
                              </div>
                              <span className="w-11 shrink-0 text-right font-sans text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                {(s.count ?? 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

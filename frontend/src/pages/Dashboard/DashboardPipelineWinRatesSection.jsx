import { useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import { cn } from '../../utils/helpers';
import { PipelineWinRatesSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardPipelineWinRatesSection({ pipelineRates }) {
  const rows = useMemo(() => {
    const list = pipelineRates.data?.pipelines || [];
    return [...list].sort((a, b) => (b.leadCount || 0) - (a.leadCount || 0));
  }, [pipelineRates.data]);

  return (
    <Card className="overflow-hidden rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div>
          <UiSectionTitle>Pipeline conversion</UiSectionTitle>
          <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
            If the pipeline&apos;s last stage is marked as conversion: rate = leads in a conversion stage with
            status “converted”. Otherwise: completed % = share of leads on the final stage. Filters apply except
            pipeline.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {pipelineRates.loading ? (
          <PipelineWinRatesSkeleton />
        ) : pipelineRates.error ? (
          sectionError(pipelineRates.error)
        ) : rows.length === 0 ? (
          <p className="py-8 text-center font-sans text-sm text-slate-500">No pipelines in scope.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <table className="w-full min-w-[720px] font-sans text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-400">
                  <th className="px-4 py-3">Pipeline</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Last stage</th>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Count</th>
                  <th className="min-w-[180px] px-4 py-3">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {rows.map((row) => {
                  const isConversion = row.metricType === 'conversion' || row.lastStageIsConversion;
                  const metricLabel = isConversion ? 'Conversion' : 'Completed';
                  const count = row.metricCount ?? row.wonLeads ?? 0;

                  return (
                    <tr key={String(row.pipelineId)} className="bg-white dark:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.teamName || '—'}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.terminalStageName || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            isConversion
                              ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
                          )}
                        >
                          {metricLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {(row.leadCount ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {count.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isConversion
                                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                                  : 'bg-gradient-to-r from-sky-500 to-cyan-500',
                                row.winRatePercent <= 0 && 'opacity-30'
                              )}
                              style={{ width: `${Math.min(100, row.winRatePercent ?? 0)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'w-14 shrink-0 text-right text-xs font-semibold tabular-nums',
                              isConversion
                                ? 'text-violet-700 dark:text-violet-300'
                                : 'text-sky-700 dark:text-sky-300'
                            )}
                          >
                            {row.winRatePercent ?? 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

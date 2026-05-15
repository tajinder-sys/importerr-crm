import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';
import { UserPerformanceTooltip } from './DashboardChartTooltips';
import { PerformanceTableSkeleton } from './DashboardSkeletons';
import { formatStageDuration } from '../../utils/formatSlaRemaining';
import { RECENT_PERF_CARD_BASE, RECENT_PERF_CARD_HEIGHT } from './dashboardLayout';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardUserPerformanceSection({ userPerf }) {
  const userPerformanceRows = userPerf.data?.users || [];
  const userPerformanceChart = userPerformanceRows.map((u) => ({
    name: u.name,
    leadCount: u.leadCount,
    convertedLeads: u.convertedLeads ?? u.wonStageLeads ?? 0,
    lastStageLeads: u.lastStageLeads ?? 0,
    conversionRatePercent: u.conversionRatePercent ?? u.stageWinRatePercent ?? 0,
    lastStageSharePercent: u.lastStageSharePercent ?? 0,
    wonStageLeads: u.convertedLeads ?? u.wonStageLeads ?? 0,
    stageWinRatePercent: u.conversionRatePercent ?? u.stageWinRatePercent ?? 0,
    avgSlaTimelineSeconds: u.avgSlaTimelineSeconds,
    avgSlaTimelineLabel:
      u.avgSlaTimelineSeconds != null ? formatStageDuration(u.avgSlaTimelineSeconds) : null,
  }));

  return (
    <Card className={`${RECENT_PERF_CARD_BASE} ${RECENT_PERF_CARD_HEIGHT} lg:col-span-3`}>
      <CardHeader className="shrink-0 border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <UiSectionTitle>User performance</UiSectionTitle>
        <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
          Conversion = conversion stage + status “converted” (includes completed). Last stage % = active leads on
          final stage. Avg SLA time = mean total time across stages per active lead.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {userPerf.loading ? (
          <div className="h-56 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-900/30">
            <PerformanceTableSkeleton />
          </div>
        ) : userPerf.error ? (
          sectionError(userPerf.error)
        ) : (
          <>
            <div className="h-56 shrink-0 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-900/30 sm:h-64">
              {userPerformanceChart.length === 0 ? (
                <div className="flex h-full items-center justify-center font-sans text-sm text-slate-500">
                  No performance rows for this view.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userPerformanceChart} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      unit="%"
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<UserPerformanceTooltip />} />
                    <Bar dataKey="conversionRatePercent" fill="#7c3aed" radius={[8, 8, 0, 0]} name="Conversion %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {userPerformanceRows.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <table className="w-full font-sans text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-400">
                      <th className="px-4 py-2.5">User</th>
                      <th className="px-4 py-2.5 text-right">Leads</th>
                      <th className="px-4 py-2.5 text-right">Converted</th>
                      <th className="px-4 py-2.5 text-right">Last stage</th>
                      <th className="px-4 py-2.5 text-right">Conv. %</th>
                      <th className="px-4 py-2.5 text-right">Avg SLA time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {userPerformanceRows.map((row) => (
                      <tr
                        key={String(row.userId)}
                        className="bg-white hover:bg-slate-50/60 dark:bg-slate-800 dark:hover:bg-slate-700/80"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {row.leadCount}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {row.convertedLeads ?? row.wonStageLeads ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                          {row.lastStageLeads ?? 0}
                          <span className="ml-1 text-[10px] text-slate-400">
                            ({row.lastStageSharePercent ?? 0}%)
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-violet-700 dark:text-violet-400">
                          {row.conversionRatePercent ?? row.stageWinRatePercent ?? 0}%
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {row.avgSlaTimelineSeconds != null
                            ? formatStageDuration(row.avgSlaTimelineSeconds)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

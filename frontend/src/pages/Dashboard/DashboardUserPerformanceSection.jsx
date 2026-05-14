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
    wonStageLeads: u.wonStageLeads,
    stageWinRatePercent: u.stageWinRatePercent ?? 0
  }));

  return (
    <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 lg:col-span-3">
      <CardHeader className="border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <UiSectionTitle>User performance</UiSectionTitle>
        <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
          Conversion = share of assigned leads currently in the pipeline&apos;s terminal (max order) stage.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {userPerf.loading ? (
          <div className="h-56 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-900/30">
            <PerformanceTableSkeleton />
          </div>
        ) : userPerf.error ? (
          sectionError(userPerf.error)
        ) : (
          <>
            <div className="h-64 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-900/30">
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
                    <Bar dataKey="stageWinRatePercent" fill="#7c3aed" radius={[8, 8, 0, 0]} name="Conversion" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {userPerformanceRows.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <table className="w-full font-sans text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      <th className="px-4 py-2.5">User</th>
                      <th className="px-4 py-2.5 text-right">Leads</th>
                      <th className="px-4 py-2.5 text-right">Won</th>
                      <th className="px-4 py-2.5 text-right">Conv.</th>
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
                          {row.wonStageLeads}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-violet-700 dark:text-violet-400">
                          {row.stageWinRatePercent}%
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

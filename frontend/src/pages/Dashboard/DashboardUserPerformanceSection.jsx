import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { UserPerformanceTooltip } from './DashboardChartTooltips';
import { PerformanceTableSkeleton } from './DashboardSkeletons';
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
  const chartData = userPerformanceRows.map((u) => ({
    name: u.name,
    convertedLeads: u.convertedLeads ?? 0,
  }));

  return (
    <Card className={`${RECENT_PERF_CARD_BASE} ${RECENT_PERF_CARD_HEIGHT} w-full`}>
      <CardHeader className="shrink-0 border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <UiSectionTitle>User performance</UiSectionTitle>
        <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
          Total converted leads per assignee (conversion stage + status “converted”), for the current filters.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {userPerf.loading ? (
          <div className="h-[min(360px,50vh)] flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-900/30">
            <PerformanceTableSkeleton />
          </div>
        ) : userPerf.error ? (
          sectionError(userPerf.error)
        ) : chartData.length === 0 ? (
          <div className="flex min-h-[280px] flex-1 items-center justify-center font-sans text-sm text-slate-500">
            No converted leads in this view.
          </div>
        ) : (
          <div className="min-h-[min(360px,50vh)] flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={chartData.length > 6 ? -25 : 0}
                  textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                  height={chartData.length > 6 ? 56 : 32}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<UserPerformanceTooltip />} />
                <Bar
                  dataKey="convertedLeads"
                  fill="#7c3aed"
                  radius={[8, 8, 0, 0]}
                  name="Converted leads"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

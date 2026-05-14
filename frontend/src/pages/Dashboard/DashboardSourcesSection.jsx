import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { formatLabel } from '../../utils/helpers';
import { DASHBOARD_SOURCE_COLORS } from './dashboardConstants';
import { ChartTooltip } from './DashboardChartTooltips';
import { CardSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardSourcesSection({ sources }) {
  const sourceChartData = (sources.data?.sources || []).map((r, index) => ({
    source: r.source || 'unknown',
    count: r.count,
    fill: DASHBOARD_SOURCE_COLORS[index % DASHBOARD_SOURCE_COLORS.length]
  }));

  return (
    <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div>
          <UiSectionTitle>Lead sources</UiSectionTitle>
          <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">Volume by source (scoped).</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          {sources.loading ? (
            <CardSkeleton />
          ) : sources.error ? (
            sectionError(sources.error)
          ) : sourceChartData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-900/40">
              <p className="font-sans text-sm font-medium text-slate-600 dark:text-slate-300">No source data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceChartData}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={52}
                  paddingAngle={2}
                >
                  {sourceChartData.map((entry) => (
                    <Cell key={entry.source} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <ChartTooltip
                        active={active}
                        payload={[{ name: formatLabel(p.source), value: p.count, dataKey: 'count' }]}
                        label={formatLabel(p.source)}
                      />
                    );
                  }}
                />
                <Legend formatter={(value) => formatLabel(value)} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

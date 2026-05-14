import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart
} from 'recharts';
import { ChartTooltip } from './DashboardChartTooltips';
import { CardSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardTimelineSection({ timeline }) {
  const timelineData = (timeline.data?.points || []).map((p) => ({
    label: p.date,
    count: p.count
  }));

  return (
    <Card className="overflow-hidden rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="border-slate-100 bg-white py-5 dark:border-slate-700 dark:bg-slate-800">
        <div>
          <UiSectionTitle>Leads created (daily)</UiSectionTitle>
          <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
            Same filters as KPIs; &quot;All&quot; time range uses a 90-day chart window.
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-6 pt-2">
        {timeline.loading ? (
          <CardSkeleton h="h-72" />
        ) : timeline.error ? (
          sectionError(timeline.error)
        ) : (
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadAreaDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip valueSuffix=" leads" />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Leads"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#leadAreaDash)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { formatStageDuration } from '../../utils/formatSlaRemaining';

export const ChartTooltip = ({ active, payload, label, valueSuffix = '' }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{label ?? row.name}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-800 dark:text-slate-200">{p.name || p.dataKey}:</span>{' '}
          {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          {valueSuffix}
        </p>
      ))}
    </div>
  );
};

export const UserPerformanceTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{point.name}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Conversion rate: {point.conversionRatePercent ?? point.stageWinRatePercent}%
      </p>
      <p className="text-slate-600 dark:text-slate-300">Leads in view: {point.leadCount}</p>
      <p className="text-slate-600 dark:text-slate-300">
        Converted (stage + status): {point.convertedLeads ?? point.wonStageLeads}
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        On last stage: {point.lastStageLeads} ({point.lastStageSharePercent ?? 0}%)
      </p>
      {point.avgSlaTimelineSeconds != null ? (
        <p className="text-slate-600 dark:text-slate-300">
          Avg SLA time: {formatStageDuration(point.avgSlaTimelineSeconds)}
        </p>
      ) : null}
    </div>
  );
};

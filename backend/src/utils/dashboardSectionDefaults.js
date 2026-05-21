/**
 * Default dashboard section registry. Keys must match frontend Dashboard.jsx section ids.
 */
const DASHBOARD_SECTION_DEFAULTS = [
  { key: 'kpis', label: 'KPI overview', description: 'Summary metrics cards at the top.', order: 10, visible: true },
  { key: 'timeline', label: 'Lead timeline', description: 'Leads created over time chart.', order: 20, visible: true },
  { key: 'pipeline_win_rates', label: 'Pipeline win rates', description: 'Win rate table by pipeline.', order: 30, visible: true },
  { key: 'sources', label: 'Leads by source', description: 'Source distribution chart.', order: 50, visible: true },
  { key: 'stages', label: 'Pipeline by stage', description: 'Stage distribution across pipelines.', order: 60, visible: true },
  { key: 'user_performance', label: 'User performance', description: 'Converted leads per assignee (chart).', order: 70, visible: true },
  { key: 'sla_alerts', label: 'SLA alerts', description: 'Due soon and team overdue lead timers.', order: 90, visible: true },
];

module.exports = { DASHBOARD_SECTION_DEFAULTS };

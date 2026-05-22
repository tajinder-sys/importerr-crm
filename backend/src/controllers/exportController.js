const Lead     = require('../models/lead');
const User     = require('../models/User');
const Team     = require('../models/Team');
const Task     = require('../models/Task');
const Activity = require('../models/activity');
const AiLog    = require('../models/AiLog');
const Pipeline = require('../models/Pipeline');
const Stage    = require('../models/Stage');
const { sendBadRequest, sendServerError } = require('../utils/responseHandler');

// ── CSV helpers ───────────────────────────────────────────────────
const esc = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};
const toCSV = (rows, cols) => {
  const header = cols.map((c) => esc(c.label)).join(',');
  const body   = rows.map((r) => cols.map((c) => esc(c.get(r))).join(',')).join('\n');
  return `${header}\n${body}`;
};

// ── Date range helper ─────────────────────────────────────────────
const getDateRange = (preset, from, to) => {
  const now = new Date();
  if (preset === 'custom' && from && to) {
    return { $gte: new Date(from), $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
  }
  const days = { '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365 }[preset];
  if (days) {
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return { $gte: start, $lte: now };
  }
  return null; // all time
};

// ── REPORT DEFINITIONS ────────────────────────────────────────────
const REPORTS = {

  leads: {
    label: 'Leads',
    columns: [
      { key: 'name',        label: 'Name',         get: (r) => r.name },
      { key: 'email',       label: 'Email',        get: (r) => r.email },
      { key: 'phone',       label: 'Phone',        get: (r) => r.phone },
      { key: 'source',      label: 'Source',       get: (r) => r.source },
      { key: 'status',      label: 'Status',       get: (r) => r.status },
      { key: 'priority',    label: 'Priority',     get: (r) => r.priority },
      { key: 'leadType',    label: 'Lead Type',    get: (r) => r.leadType },
      { key: 'assignedTo',  label: 'Assigned To',  get: (r) => r.assignedTo?.name || '' },
      { key: 'pipeline',    label: 'Pipeline',     get: (r) => r.pipelineId?.name || '' },
      { key: 'stage',       label: 'Stage',        get: (r) => r.stageId?.name || '' },
      { key: 'subject',     label: 'Subject',      get: (r) => r.subject },
      { key: 'issueCategory', label: 'Issue Category', get: (r) => r.issueCategory },
      { key: 'actualSku',   label: 'Actual SKU',   get: (r) => r.actualProduct?.sku || r.actualSku || '' },
      {
        key: 'actualTotalQty',
        label: 'Actual Qty',
        get: (r) => {
          const lines = r.actualProduct?.variants;
          if (Array.isArray(lines) && lines.length) {
            return lines.reduce((s, v) => s + (Number(v?.quantity) || 0), 0);
          }
          return r.actualTotalQuantity ?? '';
        },
      },
      { key: 'productSku',  label: 'Buying SKU',   get: (r) => r.productSku },
      { key: 'totalQty',    label: 'Buying Qty',   get: (r) => r.totalQuantity },
      { key: 'importerOrderId', label: 'Importerr order ID', get: (r) => r.importerOrderId },
      { key: 'message',     label: 'Message',      get: (r) => r.message },
      { key: 'createdAt',   label: 'Created At',   get: (r) => r.createdAt?.toISOString() },
    ],
    async fetch(dateFilter) {
      const query = dateFilter ? { createdAt: dateFilter } : {};
      return Lead.find(query)
        .populate('assignedTo', 'name')
        .populate('pipelineId', 'name')
        .populate('stageId', 'name')
        .lean();
    },
  },

  users: {
    label: 'Users',
    columns: [
      { key: 'name',      label: 'Name',       get: (r) => r.name },
      { key: 'email',     label: 'Email',      get: (r) => r.email },
      { key: 'phone',     label: 'Phone',      get: (r) => r.phone },
      { key: 'role',      label: 'Role',       get: (r) => r.role },
      { key: 'isActive',  label: 'Active',     get: (r) => r.isActive ? 'Yes' : 'No' },
      { key: 'team',      label: 'Team',       get: (r) => r.team_id?.name || '' },
      { key: 'lastLogin', label: 'Last Login', get: (r) => r.lastLogin?.toISOString() || '' },
      { key: 'createdAt', label: 'Joined At',  get: (r) => r.createdAt?.toISOString() },
    ],
    async fetch(dateFilter) {
      const query = dateFilter ? { createdAt: dateFilter } : {};
      return User.find(query).populate('team_id', 'name').lean();
    },
  },

  teams: {
    label: 'Teams',
    columns: [
      { key: 'name',         label: 'Team Name',    get: (r) => r.name },
      { key: 'description',  label: 'Description',  get: (r) => r.description },
      { key: 'status',       label: 'Status',       get: (r) => r.status },
      { key: 'manager',      label: 'Team Manager', get: (r) => r._manager || '' },
      { key: 'memberCount',  label: 'Member Count', get: (r) => r._memberCount ?? 0 },
      { key: 'createdAt',    label: 'Created At',   get: (r) => r.createdAt?.toISOString() },
    ],
    async fetch(dateFilter) {
      const query = dateFilter ? { createdAt: dateFilter } : {};
      const teams = await Team.find(query).lean();
      if (!teams.length) return teams;

      const teamIds = teams.map((t) => t._id);

      const [managers, counts] = await Promise.all([
        User.find({ team_id: { $in: teamIds }, role: 'team_manager', isActive: true })
          .select('name team_id').lean(),
        User.aggregate([
          { $match: { team_id: { $in: teamIds } } },
          { $group: { _id: '$team_id', count: { $sum: 1 } } },
        ]),
      ]);

      const managerMap = {};
      managers.forEach((u) => { managerMap[String(u.team_id)] = u.name; });

      const countMap = {};
      counts.forEach((c) => { countMap[String(c._id)] = c.count; });

      return teams.map((t) => ({
        ...t,
        _manager:     managerMap[String(t._id)] || '',
        _memberCount: countMap[String(t._id)] ?? 0,
      }));
    },
  },

  tasks: {
    label: 'Tasks',
    columns: [
      { key: 'title',       label: 'Title',        get: (r) => r.title },
      { key: 'description', label: 'Description',  get: (r) => r.description },
      { key: 'task_type',   label: 'Type',         get: (r) => r.task_type },
      { key: 'status',      label: 'Status',       get: (r) => r.status },
      { key: 'priority',    label: 'Priority',     get: (r) => r.priority },
      { key: 'assigned_to', label: 'Assigned To',  get: (r) => r.assigned_to?.name || '' },
      { key: 'created_by',  label: 'Created By',   get: (r) => r.created_by?.name || '' },
      { key: 'lead',        label: 'Lead',         get: (r) => r.lead_id?.name || '' },
      { key: 'start_date',  label: 'Start Date',   get: (r) => r.start_date?.toISOString() || '' },
      { key: 'due_date',    label: 'Due Date',     get: (r) => r.due_date?.toISOString() || '' },
      { key: 'completed_at',label: 'Completed At', get: (r) => r.completed_at?.toISOString() || '' },
      { key: 'createdAt',   label: 'Created At',   get: (r) => r.createdAt?.toISOString() },
    ],
    async fetch(dateFilter) {
      const query = dateFilter ? { createdAt: dateFilter } : {};
      return Task.find(query)
        .populate('assigned_to', 'name')
        .populate('created_by', 'name')
        .populate('lead_id', 'name')
        .lean();
    },
  },

  activities: {
    label: 'Activities',
    columns: [
      { key: 'type',        label: 'Type',         get: (r) => r.type },
      { key: 'description', label: 'Description',  get: (r) => r.description },
      { key: 'performedBy', label: 'Performed By', get: (r) => r.performedBy?.name || '' },
      { key: 'lead',        label: 'Lead',         get: (r) => r.lead?.name || '' },
      { key: 'createdAt',   label: 'Created At',   get: (r) => r.createdAt?.toISOString() },
    ],
    async fetch(dateFilter) {
      const query = dateFilter ? { createdAt: dateFilter } : {};
      return Activity.find(query)
        .populate('performedBy', 'name')
        .populate('lead', 'name')
        .lean();
    },
  },

  ai_logs: {
    label: 'AI Logs',
    columns: [
      { key: 'callType',    label: 'Call Type',    get: (r) => r.callType },
      { key: 'model',       label: 'Model',        get: (r) => r.model },
      { key: 'success',     label: 'Success',      get: (r) => r.success ? 'Yes' : 'No' },
      { key: 'latencyMs',   label: 'Latency (ms)', get: (r) => r.latencyMs },
      { key: 'tokensTotal', label: 'Tokens Used',  get: (r) => r.tokensUsed?.total || 0 },
      { key: 'lead',        label: 'Lead ID',      get: (r) => r.leadId?.toString() || '' },
      { key: 'error',       label: 'Error',        get: (r) => r.error || '' },
      { key: 'createdAt',   label: 'Created At',   get: (r) => r.createdAt?.toISOString() },
    ],
    async fetch(dateFilter) {
      const query = dateFilter ? { createdAt: dateFilter } : {};
      return AiLog.find(query).lean();
    },
  },
};

// ── GET /api/export/config ────────────────────────────────────────
const getConfig = (req, res) => {
  const config = Object.entries(REPORTS).map(([key, r]) => ({
    key,
    label: r.label,
    columns: r.columns.map((c) => ({ key: c.key, label: c.label })),
  }));
  res.json({ success: true, data: config });
};

// ── POST /api/export/generate ─────────────────────────────────────
const generate = async (req, res) => {
  try {
    const { reportType, columns: selectedCols, datePreset, dateFrom, dateTo } = req.body;

    const report = REPORTS[reportType];
    if (!report) return sendBadRequest(res, 'Invalid report type');
    if (!selectedCols?.length) return sendBadRequest(res, 'Select at least one column');

    const dateFilter = getDateRange(datePreset, dateFrom, dateTo);
    const cols = report.columns.filter((c) => selectedCols.includes(c.key));
    const rows = await report.fetch(dateFilter, cols);
    const csv  = toCSV(rows, cols);

    const filename = `${reportType}_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('[Export Error]', err);
    return sendServerError(res, err.message || 'Export failed');
  }
};

module.exports = { getConfig, generate };

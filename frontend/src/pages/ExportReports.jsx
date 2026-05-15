import { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, FileDown, Calendar, CheckSquare, Square, Loader2, FileText, Users, Users2, ClipboardList, Activity, Bot, ChevronRight, Sparkles } from 'lucide-react';
import Button from '../components/common/ui/Button';
import Snackbar from '../components/common/ui/Snackbar';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DATE_PRESETS = [
  { key: '7d',     label: 'Last 7 days' },
  { key: '30d',    label: 'Last 30 days' },
  { key: '90d',    label: 'Last 3 months' },
  { key: '180d',   label: 'Last 6 months' },
  { key: '365d',   label: 'Last 1 year' },
  { key: 'all',    label: 'All time' },
  { key: 'custom', label: 'Custom range' },
];

const REPORT_META = {
  leads:      { icon: Users,         color: '#6366f1', bg: '#eef2ff', desc: 'All lead records with status, source & assignment' },
  users:      { icon: Users2,        color: '#0ea5e9', bg: '#f0f9ff', desc: 'Team members, roles and login activity' },
  teams:      { icon: Users2,        color: '#10b981', bg: '#f0fdf4', desc: 'Team structure and member counts' },
  tasks:      { icon: ClipboardList, color: '#f59e0b', bg: '#fffbeb', desc: 'Tasks with status, priority and due dates' },
  activities: { icon: Activity,      color: '#ec4899', bg: '#fdf2f8', desc: 'Lead activity and audit trail' },
  ai_logs:    { icon: Bot,           color: '#8b5cf6', bg: '#f5f3ff', desc: 'AI assignment logs with token usage' },
};

const ExportReports = () => {
  const [config, setConfig]                 = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedCols, setSelectedCols]     = useState([]);
  const [datePreset, setDatePreset]         = useState('30d');
  const [dateFrom, setDateFrom]             = useState('');
  const [dateTo, setDateTo]                 = useState('');
  const [generating, setGenerating]         = useState(false);
  const [downloadUrl, setDownloadUrl]       = useState(null);
  const [downloadName, setDownloadName]     = useState('');
  const [snackbar, setSnackbar]             = useState({ open: false, message: '', type: 'success' });

  const showMsg = (message, type = 'success') => setSnackbar({ open: true, message, type });

  useEffect(() => {
    api.get(API_ROUTES.export.config).then((res) => setConfig(res?.data || [])).catch(() => {});
  }, []);

  const handleSelectReport = (report) => {
    setSelectedReport(report);
    setSelectedCols(report.columns.map((c) => c.key));
    setDownloadUrl(null);
  };

  const toggleCol = (key) =>
    setSelectedCols((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const toggleAllCols = () => {
    if (!selectedReport) return;
    setSelectedCols(selectedCols.length === selectedReport.columns.length ? [] : selectedReport.columns.map((c) => c.key));
  };

  const handleGenerate = async () => {
    if (!selectedReport) return showMsg('Select a report type', 'error');
    if (!selectedCols.length) return showMsg('Select at least one column', 'error');
    if (datePreset === 'custom' && (!dateFrom || !dateTo)) return showMsg('Select custom date range', 'error');
    setGenerating(true);
    setDownloadUrl(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}${API_ROUTES.export.generate}`,
        { reportType: selectedReport.key, columns: selectedCols, datePreset, dateFrom, dateTo },
        { responseType: 'blob', headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const name = `${selectedReport.key}_${new Date().toISOString().slice(0, 10)}.csv`;
      setDownloadUrl(url);
      setDownloadName(name);
      showMsg('Report generated! Click Download to save.');
    } catch (err) {
      showMsg(err?.response?.data?.message || err?.message || 'Export failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = downloadName;
    a.click();
  };

  return (
    <div className="min-h-screen dark:bg-slate-900">

      {/* ── Hero header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/40">
              <FileDown className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Export Reports</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Generate and download CSV reports with custom filters</p>
            </div>
          </div>
          {/* Generate / Download CTA */}
          <div className="flex items-center gap-3">
            {downloadUrl && (
              <Button type="button" variant="outline" onClick={handleDownload}
                startIcon={<Download className="h-4 w-4" />}>
                Download CSV
              </Button>
            )}
            <Button type="button" onClick={handleGenerate}
              disabled={generating || !selectedReport || !selectedCols.length}
              startIcon={generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
              {generating ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        {selectedReport && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <FileText className="h-3 w-3" /> {selectedReport.label}
            </span>
            <ChevronRight className="h-3 w-3 text-gray-300" />
            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <CheckSquare className="h-3 w-3" /> {selectedCols.length} column{selectedCols.length !== 1 ? 's' : ''}
            </span>
            <ChevronRight className="h-3 w-3 text-gray-300" />
            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <Calendar className="h-3 w-3" /> {DATE_PRESETS.find((p) => p.key === datePreset)?.label}
            </span>
            {downloadUrl && (
              <>
                <ChevronRight className="h-3 w-3 text-gray-300" />
                <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Ready to download
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[280px_1fr_260px] lg:divide-x lg:divide-gray-200 dark:lg:divide-slate-700" style={{ minHeight: 'calc(100vh - 140px)' }}>

        {/* ── Col 1: Report Type ── */}
        <div className="border-b border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 lg:border-b-0">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">Report Type</p>
          <div className="space-y-2">
            {config.map((r) => {
              const m = REPORT_META[r.key] || {};
              const Icon = m.icon || FileDown;
              const active = selectedReport?.key === r.key;
              return (
                <button key={r.key} type="button" onClick={() => handleSelectReport(r)}
                  className={`group w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                  }`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: active ? m.bg : undefined, backgroundColor: !active ? undefined : m.bg }}>
                    <Icon className="h-4 w-4" style={{ color: m.color || '#6b7280' }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${active ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-slate-300'}`}>{r.label}</p>
                    <p className="truncate text-[11px] text-gray-400 dark:text-slate-500">{m.desc || ''}</p>
                  </div>
                  {active && <div className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Col 2: Columns ── */}
        <div className="border-b border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 lg:border-b-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">Select Columns</p>
            {selectedReport && (
              <button type="button" onClick={toggleAllCols}
                className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-primary-600 transition hover:bg-primary-50 dark:border-slate-600 dark:text-primary-400 dark:hover:bg-primary-900/20">
                {selectedCols.length === selectedReport.columns.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {!selectedReport ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-slate-700">
                <FileText className="h-6 w-6 text-gray-300 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Select a report type first</p>
              <p className="mt-1 text-xs text-gray-300 dark:text-slate-600">Columns will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {selectedReport.columns.map((col) => {
                const checked = selectedCols.includes(col.key);
                return (
                  <button key={col.key} type="button" onClick={() => toggleCol(col.key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                      checked
                        ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-slate-600'
                    }`}>
                    {checked
                      ? <CheckSquare className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                      : <Square className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-slate-600" />}
                    {col.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Col 3: Date Range ── */}
        <div className="bg-white p-5 dark:bg-slate-800">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">Date Range</p>
          <div className="space-y-1.5">
            {DATE_PRESETS.map((p) => (
              <button key={p.key} type="button" onClick={() => setDatePreset(p.key)}
                className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                  datePreset === p.key
                    ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                }`}>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {p.label}
                {datePreset === p.key && <div className="ml-auto h-2 w-2 rounded-full bg-primary-500" />}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              </div>
            </div>
          )}

          {/* Generating progress */}
          {generating && (
            <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-700 dark:bg-primary-900/20">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" />
                <div>
                  <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">Generating report…</p>
                  <p className="text-xs text-primary-500 dark:text-primary-500">This may take a moment</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900">
                <div className="h-full animate-pulse rounded-full bg-primary-400" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Download ready */}
          {downloadUrl && !generating && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Report ready!</p>
              <p className="mt-0.5 text-xs text-green-600 dark:text-green-500">{downloadName}</p>
              <button type="button" onClick={handleDownload}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <Snackbar open={snackbar.open} message={snackbar.message} type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))} />
    </div>
  );
};

export default ExportReports;

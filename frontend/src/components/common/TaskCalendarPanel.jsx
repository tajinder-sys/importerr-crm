// TaskCalendarPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Calendar, ChevronLeft, ChevronRight, X, ExternalLink,
  Phone, Mail, Users, Video, MessageSquare, MapPin,
  RotateCcw, Zap, Clock, Bell, RefreshCw, ListCheck,
} from 'lucide-react';
import { fetchCalendarTasks } from '../../store/tasksSlice';
import { refreshTodayTasksCount } from '../../store/authSlice';

/* ── constants ───────────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const TYPE_ICONS = {
  call: Phone, email: Mail, meeting: Users, demo: Video,
  whatsapp: MessageSquare, visit: MapPin, follow_up: RotateCcw, custom: Zap,
};
const PRIORITY_CLS = {
  low:    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  medium: 'bg-amber-50  text-amber-700  border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  high:   'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
  urgent: 'bg-rose-50   text-rose-700   border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700',
};
const STATUS_CLS = {
  pending:     'bg-amber-50   text-amber-700   border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  in_progress: 'bg-blue-50    text-blue-700    border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
  cancelled:   'bg-rose-50    text-rose-700    border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700',
};

/* ── helpers ─────────────────────────────────────────────────── */
const toDateKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const todayKey = () => toDateKey(new Date().toISOString());

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

const fmtLabel = (key) => {
  if (key === todayKey()) return 'Today';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

/* ── Pill ────────────────────────────────────────────────────── */
const Pill = ({ label, cls, icon: Icon }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
    {Icon && <Icon size={9} />}
    {label}
  </span>
);

/* ── TaskCalendarPanel ───────────────────────────────────────── */
export default function TaskCalendarPanel() {
  const today = new Date();
  const dispatch = useDispatch();
  const tasks = useSelector((s) => s.tasks.calendarTasks);
  const loading = useSelector((s) => s.tasks.calendarLoading);
  const todayTasksCount = useSelector((s) => s.auth.todayTasksCount ?? 0);
  const [open, setOpen]           = useState(false);
  const [curYear, setCurYear]     = useState(today.getFullYear());
  const [curMonth, setCurMonth]   = useState(today.getMonth());
  const [selectedKey, setSelKey]  = useState(todayKey());
  const panelRef = useRef(null);

  useEffect(() => {
    if (open) {
      dispatch(fetchCalendarTasks());
      dispatch(refreshTodayTasksCount());
    }
  }, [open, dispatch]);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* build date → tasks map */
  const byDate = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const k = toDateKey(t.due_date);
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  });

  const monthStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;
  const monthTaskCount = Object.keys(byDate)
    .filter((k) => k.startsWith(monthStr))
    .reduce((acc, k) => acc + byDate[k].length, 0);

  /* calendar grid cells */
  const firstDay     = new Date(curYear, curMonth, 1).getDay();
  const daysInMonth  = new Date(curYear, curMonth + 1, 0).getDate();
  const prevDays     = new Date(curYear, curMonth, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++)
    cells.push({ day: prevDays - firstDay + 1 + i, current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, current: true });
  while (cells.length < 42)
    cells.push({ day: cells.length - firstDay - daysInMonth + 1, current: false });

  const selectedTasks = byDate[selectedKey] || [];

  const prevMonth = () => {
    if (curMonth === 0) { setCurMonth(11); setCurYear((y) => y - 1); }
    else setCurMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurMonth(0); setCurYear((y) => y + 1); }
    else setCurMonth((m) => m + 1);
  };

  return (
    <>
      {/* ── Trigger button (goes in your header) ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Task calendar"
        aria-label="Open task calendar"
        className="relative flex h-9 w-9 items-center border border-gray-200 justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 md:h-auto md:w-auto md:gap-1.5 md:px-1.5 md:py-1.5 md:text-sm md:font-medium md:hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700"
      >
        <Calendar className="h-5 w-5 md:h-[20px] md:w-[20px]" />
        {todayTasksCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5
            text-[9px] font-bold bg-violet-600 text-white rounded-full
            flex items-center justify-center"
            title={`${todayTasksCount} task${todayTasksCount === 1 ? '' : 's'} due today`}
          >
            {todayTasksCount > 99 ? '99+' : todayTasksCount}
          </span>
        )}
      </button>

      {/* ── Panel — fixed, full height right side ── */}
      {open && (
        <div
          ref={panelRef}
          className="fixed top-0 right-0 h-screen w-[340px] z-50 flex flex-col
            bg-white border-l border-slate-200 shadow-2xl dark:bg-slate-800 dark:border-slate-700"
          style={{ boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Calendar size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Task calendar</p>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  {loading ? 'Loading…' : `${monthTaskCount} task${monthTaskCount !== 1 ? 's' : ''} this month`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center
                justify-center text-white transition-colors"
              aria-label="Close panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 flex-shrink-0 dark:border-slate-700">
            <button onClick={prevMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-700">
              <ChevronLeft size={12} className="text-slate-500" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {MONTHS[curMonth]} {curYear}
            </span>
            <button onClick={nextMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 transition-colors dark:border-slate-600 dark:hover:bg-slate-700">
              <ChevronRight size={12} className="text-slate-500" />
            </button>
          </div>

          {/* Calendar grid */}
          <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0 dark:border-slate-700">
            <div className="grid grid-cols-7 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1 dark:text-slate-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell, i) => {
                if (!cell.current) return (
                  <div key={i} className="aspect-square flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-600">
                    {cell.day}
                  </div>
                );
                const key = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
                const hasTasks  = Boolean(byDate[key]);
                const hasOverdue = hasTasks && byDate[key].some((t) => t.isOverdue);
                const isToday   = key === todayKey();
                const isSel     = key === selectedKey;
                return (
                  <button
                    key={i}
                    onClick={() => setSelKey(key)}
                    className={`aspect-square relative flex flex-col items-center justify-center
                      text-[11px] rounded-lg transition-all
                      ${isSel
                        ? 'bg-indigo-600 text-white font-semibold'
                        : isToday
                          ? 'border border-indigo-400 text-indigo-600 font-semibold hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-600 dark:hover:bg-indigo-900/30'
                          : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                  >
                    {cell.day}
                    {hasTasks && (
                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full
                        ${isSel ? 'bg-white' : hasOverdue ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tasks list — scrollable, fills remaining height */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex items-center justify-between px-4 py-2.5 sticky top-0 bg-white border-b border-slate-100 z-10 dark:bg-slate-800 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{fmtLabel(selectedKey)}</span>
              {selectedTasks.length > 0 && (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600">
                  {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <Calendar size={28} className="opacity-30" />
                <p className="text-xs">No tasks due on this date</p>
              </div>
            ) : (
              <div className="px-3 py-2.5 space-y-2">
                {selectedTasks.map((task) => {
                  const TypeIcon = TYPE_ICONS[task.task_type] || Zap;
                  const leadId   = task.lead_id?._id || '';
                  const leadName = task.lead_id?.name || '—';
                  const leadPhone = task.lead_id?.phone || '';
                  return (
                    <div
                      key={task._id}
                      className={`rounded-lg border bg-white p-2.5 transition-all hover:shadow-sm dark:bg-slate-800
                        ${task.isOverdue
                          ? 'border-l-2 border-rose-300 bg-rose-50/30 dark:bg-rose-900/10 dark:border-rose-700'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }
                        ${task.status === 'completed' ? 'opacity-60' : ''}`}
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-semibold text-slate-800 leading-snug dark:text-slate-200">{task.title}</p>
                        {task.isOverdue && (
                          <span className="text-[9px] font-bold text-rose-600 whitespace-nowrap">Overdue</span>
                        )}
                      </div>

                      {/* Pills */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <Pill label={task.task_type?.replace('_', ' ')} cls="bg-slate-100 text-slate-600 border-slate-200" icon={TypeIcon} />
                        <Pill label={task.status?.replace('_', ' ')} cls={STATUS_CLS[task.status] || ''} />
                        <Pill label={task.priority} cls={PRIORITY_CLS[task.priority] || ''} />
                        {task.is_recurring && (
                          <Pill
                            label={`${task.repeat_type} ×${task.repeat_interval}`}
                            cls="bg-blue-50 text-blue-700 border-blue-200"
                            icon={RefreshCw}
                          />
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-2 dark:text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={9} />Due {fmtTime(task.due_date)}</span>
                        {task.reminder_at && (
                          <span className="flex items-center gap-1"><Bell size={9} />{fmtTime(task.reminder_at)}</span>
                        )}
                        {task.daysUntilDue > 0 && <span>{task.daysUntilDue}d left</span>}
                      </div>

                      {task.description && (
                        <p className="text-[10px] text-slate-500 mb-2 leading-relaxed dark:text-slate-400">{task.description}</p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 min-w-0 dark:text-slate-400">
                          <span className="font-medium truncate">{leadName}</span>
                          {leadPhone && (
                            <span className="text-slate-400 hidden sm:inline truncate">· {leadPhone}</span>
                          )}
                        </div>
                        <button
                          onClick={() => window.open(`/leads/${leadId}`, '_blank', 'noopener,noreferrer')}
                          className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold
                            text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200
                            px-2 py-1 rounded-md transition-colors ml-2"
                        >
                          <ExternalLink size={9} />Open lead
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer actions — always visible at bottom */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 bg-white flex-shrink-0 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => window.open('/activities', '_blank', 'noopener,noreferrer')}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium
                text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:text-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600
                rounded-lg transition-colors"
            >
              <ListCheck size={13} />All tasks
            </button>
          </div>
        </div>
      )}
    </>
  );
}
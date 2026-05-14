import { useState, useEffect, startTransition } from 'react';
import {
  Phone, Mail, Video, Users, MessageSquare, MapPin, Zap,
  CalendarDays, Clock, Flag, RotateCcw, ChevronDown, Loader2,
  CheckCircle2, Pencil, Plus,
} from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { fetchTeamAssignableUsers } from '../../utils/fetchTeamAssignableUsers';
import { USER_ROLES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import Modal from './ui/Modal';
import { SearchableSelect } from './ui';

/* ─── Constants ──────────────────────────────────────────────── */
const TASK_TYPES = [
  { value: 'call',      label: 'Call',      Icon: Phone },
  { value: 'email',     label: 'Email',     Icon: Mail },
  { value: 'meeting',   label: 'Meeting',   Icon: Users },
  { value: 'demo',      label: 'Demo',      Icon: Video },
  { value: 'whatsapp',  label: 'WhatsApp',  Icon: MessageSquare },
  { value: 'visit',     label: 'Visit',     Icon: MapPin },
  { value: 'follow_up', label: 'Follow-up', Icon: RotateCcw },
  { value: 'custom',    label: 'Custom',    Icon: Zap },
];

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:border-slate-600' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-700' },
  { value: 'high',   label: 'High',   color: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-700' },
];

const STATUSES = [
  { value: 'pending',     label: 'Pending',     color: 'text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-700 dark:border-slate-600' },
  { value: 'in_progress', label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-300 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-700' },
  { value: 'completed',   label: 'Completed',   color: 'text-emerald-600 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700' },
  { value: 'cancelled',   label: 'Cancelled',   color: 'text-rose-600 bg-rose-50 border-rose-300 dark:text-rose-400 dark:bg-rose-900/30 dark:border-rose-700' },
];

const REPEAT_TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

const EMPTY_FORM = {
  title: '',
  description: '',
  task_type: 'follow_up',
  priority: 'medium',
  status: 'pending',
  start_date: '',
  due_date: '',
  reminder_at: '',
  assigned_to: '',
  is_recurring: false,
  repeat_type: '',
  repeat_interval: 1,
  repeat_end_date: '',
};

/* ─── Helpers ────────────────────────────────────────────────── */
/**
 * Convert a stored ISO date string to the value required by
 * <input type="datetime-local">  →  "YYYY-MM-DDTHH:mm"
 */
const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    // toISOString gives "YYYY-MM-DDTHH:mm:ss.sssZ"; slice to "YYYY-MM-DDTHH:mm"
    return d.toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

const toDateOnly = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

/** Normalize populated or raw ObjectId refs to string id */
const idFromRef = (ref) => {
  if (ref == null || ref === '') return '';
  if (typeof ref === 'string') return ref.trim();
  if (typeof ref === 'object') {
    const id = ref._id ?? ref.id;
    return id != null ? String(id) : '';
  }
  return String(ref);
};

/** Hydrate form state from an existing task object */
const taskToForm = (task) => ({
  title:           task.title ?? '',
  description:     task.description ?? '',
  task_type:       task.task_type ?? 'follow_up',
  priority:        task.priority ?? 'medium',
  status:          task.status ?? 'pending',
  start_date:      toDatetimeLocal(task.start_date),
  due_date:        toDatetimeLocal(task.due_date),
  reminder_at:     toDatetimeLocal(task.reminder_at),
  assigned_to:     task.assigned_to?._id ?? task.assigned_to ?? '',
  is_recurring:    task.is_recurring ?? false,
  repeat_type:     task.repeat_type ?? '',
  repeat_interval: task.repeat_interval ?? 1,
  repeat_end_date: toDateOnly(task.repeat_end_date),
});

/* ─── Sub-components ─────────────────────────────────────────── */
const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 dark:text-slate-400">
    {children}{required && <span className="text-rose-400 ml-0.5">*</span>}
  </label>
);

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500
      placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
      transition-all ${className}`}
    {...props}
  />
);

const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={`w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500
      placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
      transition-all resize-none ${className}`}
    {...props}
  />
);

const Select = ({ children, className = '', ...props }) => (
  <div className="relative">
    <select
      className={`w-full appearance-none px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200
        text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
        transition-all pr-8 ${className}`}
      {...props}
    >
      {children}
    </select>
    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none
      ${checked ? 'bg-indigo-500' : 'bg-slate-300'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow
        transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

const TaskModal = ({ isOpen, onClose, onCreated, onUpdated, leadId, leadName, task = null }) => {
  const isEdit = Boolean(task);
  const { user } = useAuth();
  const userId = String(user?._id || user?.id || '');
  const canPickAssignee =
    user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.TEAM_MANAGER;
  const isTeamMember = user?.role === USER_ROLES.TEAM_MEMBER;

  const [form, setForm] = useState(EMPTY_FORM);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  /* Load assignee list for admins / team managers (scoped to lead pipeline team when lead is known) */
  useEffect(() => {
    if (!isOpen || !canPickAssignee) {
      startTransition(() => setAssigneeOptions([]));
      return undefined;
    }
    const leadIdForPipeline =
      idFromRef(leadId) || (isEdit && task ? idFromRef(task.lead_id) : '');

    let cancelled = false;
    (async () => {
      try {
        let list = [];
        if (!leadIdForPipeline) {
          list = await fetchTeamAssignableUsers();
        } else {
          try {
            const leadRes = await api.get(API_ROUTES.leads.byId(leadIdForPipeline));
            const leadEntity = leadRes?.data?.lead;
            const pid = idFromRef(leadEntity?.pipelineId);
            if (pid) {
              list = await fetchTeamAssignableUsers({ pipelineId: pid });
            }
          } catch {
            list = [];
          }
        }

        const byId = new Map((list || []).map((u) => [String(u._id), u]));
        if (isEdit && task?.assigned_to) {
          const a = task.assigned_to;
          const aid = String(a._id ?? a);
          if (aid && !byId.has(aid)) {
            byId.set(aid, {
              _id: aid,
              name: a.name || a.email || 'Assignee',
            });
          }
        }
        if (userId && !byId.has(userId)) {
          byId.set(userId, {
            _id: userId,
            name: user?.name || user?.email || 'Me',
          });
        }
        const merged = [...byId.values()].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
        );
        if (!cancelled) setAssigneeOptions(merged);
      } catch {
        if (!cancelled) {
          setAssigneeOptions(
            userId ? [{ _id: userId, name: user?.name || user?.email || 'Me' }] : [],
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    canPickAssignee,
    userId,
    user?.name,
    user?.email,
    leadId,
    isEdit,
    task,
    task?.lead_id,
    task?.assigned_to,
    task?._id,
  ]);

  /* Populate form when switching between create/edit or when task changes */
  useEffect(() => {
    if (!isOpen) return;
    startTransition(() => {
      setError('');
      setSuccess(false);
      if (isEdit && task) {
        setForm(taskToForm(task));
      } else {
        setForm({ ...EMPTY_FORM, assigned_to: userId });
      }
    });
  }, [isOpen, task, isEdit, userId]);

  const set = (field) => (e) =>
    setForm((f) => ({
      ...f,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const setDirect = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }));

  /* ── Submit ── */
  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Task title is required.'); return; }

    let assignedToPayload = form.assigned_to ? String(form.assigned_to).trim() : '';
    if (isTeamMember) {
      assignedToPayload = userId;
    }

    const payload = {
      ...form,
      title:          form.title.trim(),
      start_date:     form.start_date     || null,
      due_date:       form.due_date       || null,
      reminder_at:    form.reminder_at    || null,
      assigned_to:    assignedToPayload || null,
      repeat_type:    form.is_recurring   ? form.repeat_type    : undefined,
      repeat_end_date: form.is_recurring && form.repeat_end_date ? form.repeat_end_date : null,
    };

    if (!isEdit) payload.lead_id = leadId;

    setLoading(true);
    try {
      let data;
      if (isEdit) {
        data = await api.put(API_ROUTES.tasks.update(task._id), payload);
        setSuccess(true);
        setTimeout(() => { onUpdated?.(data?.data); handleClose(); }, 900);
      } else {
        data = await api.post(API_ROUTES.tasks.create, payload);
        setSuccess(true);
        setTimeout(() => { onCreated?.(data?.data); handleClose(); }, 900);
      }
    } catch (err) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} task.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError(''); setSuccess(false); setLoading(false);
    onClose();
  };

  const modalTitle = (
    <div>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center
          ${isEdit ? 'bg-amber-100' : 'bg-indigo-100'}`}>
          {isEdit
            ? <Pencil size={12} className="text-amber-600" />
            : <Plus   size={12} className="text-indigo-600" />
          }
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          {isEdit ? 'Edit Task' : 'New Task'}
        </h2>
      </div>
      {(leadName || (isEdit && task?.lead_id?.name)) && (
        <p className="text-[11px] text-slate-400 mt-1 ml-8">
          For{' '}
          <span className="font-semibold text-indigo-500">
            {leadName || task?.lead_id?.name}
          </span>
        </p>
      )}
    </div>
  );

  const modalFooter = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
          hover:bg-slate-100 rounded-lg transition-all dark:hover:bg-slate-700"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || success}
        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white
          transition-all shadow-sm active:scale-95
          ${success
            ? 'bg-emerald-500 shadow-emerald-200'
            : isEdit
              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
          }
          disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100`}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> {isEdit ? 'Saving…' : 'Creating…'}</>
        ) : success ? (
          <><CheckCircle2 size={14} /> {isEdit ? 'Saved!' : 'Created!'}</>
        ) : (
          isEdit ? 'Save Changes' : 'Create Task'
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      footer={modalFooter}
      size="lg"
    >
      <div className="space-y-4">

          {/* Title */}
          <div>
            <Label required>Title</Label>
            <Input
              placeholder="e.g. Follow up call with client"
              value={form.title}
              onChange={set('title')}
              autoFocus
            />
          </div>

          {/* Task type chips */}
          <div>
            <Label>Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {TASK_TYPES.map(({ value, label, Icon }) => {
                const active = form.task_type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDirect('task_type', value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all
                      ${active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600 dark:hover:border-indigo-600 dark:hover:text-indigo-400'
                      }`}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map(({ value, label, color }) => {
                const active = form.priority === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDirect('priority', value)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all
                      ${active
                        ? `${color} ring-2 ring-offset-1 ring-current/30`
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600 dark:hover:border-slate-500'
                      }`}
                  >
                    <Flag size={10} className="inline mr-1" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status — only shown in edit mode */}
          {isEdit && (
            <div>
              <Label>Status</Label>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(({ value, label, color }) => {
                  const active = form.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDirect('status', value)}
                      className={`flex-1 min-w-[5rem] py-1.5 rounded-lg text-[11px] font-bold border transition-all
                        ${active
                          ? `${color} ring-2 ring-offset-1 ring-current/30`
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600 dark:hover:border-slate-500'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <div className="relative">
                <CalendarDays size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-7" type="datetime-local" value={form.start_date} onChange={set('start_date')} />
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <div className="relative">
                <CalendarDays size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-7" type="datetime-local" value={form.due_date} onChange={set('due_date')} />
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div>
            <Label>Reminder</Label>
            <div className="relative">
              <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-7" type="datetime-local" value={form.reminder_at} onChange={set('reminder_at')} />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Optional notes or context…"
              value={form.description}
              onChange={set('description')}
            />
          </div>

          {/* Assignee */}
          {canPickAssignee ? (
            <div>
              <Label>Assign to</Label>
              <SearchableSelect
                name="assigned_to"
                value={form.assigned_to}
                onChange={set('assigned_to')}
                options={assigneeOptions.map((u) => ({ value: String(u._id), label: u.name || String(u._id) }))}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Choose any active team member or manager, or leave unassigned.
              </p>
            </div>
          ) : (
            <div>
              <Label>Assign to</Label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                <Users size={14} className="text-slate-400 shrink-0" />
                <span>
                  {isEdit && task?.assigned_to?.name
                    ? task.assigned_to.name
                    : 'You (this task will be assigned to you)'}
                </span>
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw size={13} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recurring task</span>
              </div>
              <Toggle
                checked={form.is_recurring}
                onChange={() => setDirect('is_recurring', !form.is_recurring)}
              />
            </div>

            {form.is_recurring && (
              <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <Label>Repeat</Label>
                  <SearchableSelect
                    name="repeat_type"
                    value={form.repeat_type}
                    onChange={set('repeat_type')}
                    options={REPEAT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                  />
                </div>
                <div>
                  <Label>Every</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.repeat_interval}
                    onChange={set('repeat_interval')}
                    placeholder="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label>End Date</Label>
                  <div className="relative">
                    <CalendarDays size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-7"
                      type="date"
                      value={form.repeat_end_date}
                      onChange={set('repeat_end_date')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[12px] text-rose-600 font-medium dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400">
              {error}
            </div>
          )}
        </div>
    </Modal>
  );
};

export default TaskModal;
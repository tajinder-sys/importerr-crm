import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Eye, Pencil, Phone, Mail, User, Calendar, MessageSquare, ListTodo, ChevronDown } from 'lucide-react';
import { formatDateIndian } from '../../../utils/helpers';
import LeadQuickViewModal from './LeadQuickViewModal';
import LeadNotes from '../../../components/common/LeadNotes';
import TaskModal from '../../../components/common/TaskModal';

/* ── helpers ──────────────────────────────────────────────────── */
const fmtPhone = (phone) => {
  if (!phone) return '-';
  const d = String(phone).replace(/\D/g, '');
  let local = d;
  if (d.startsWith('91') && d.length >= 12) local = d.slice(2, 12);
  else if (d.length > 10) local = d.slice(-10);
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const SOURCE_CLS = {
  importerr_inquiry: 'bg-violet-50 text-violet-700 border-violet-200',
  direct:            'bg-blue-50 text-blue-700 border-blue-200',
  referral:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  social_media:      'bg-pink-50 text-pink-700 border-pink-200',
  cold_call:         'bg-orange-50 text-orange-700 border-orange-200',
};
const STATUS_CLS = {
  new:       'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:      'bg-rose-50 text-rose-700 border-rose-200',
  won:       'bg-green-50 text-green-700 border-green-200',
};

const Pill = ({ label, cls }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
    {label?.replace(/_/g, ' ')}
  </span>
);

const LeadCard = ({
  lead,
  onEdit = () => {},
  onNotify = () => {},
}) => {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead._id,
    data: { lead },
  });

  const initials = (lead.name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const blockDrag = (e) => e.stopPropagation();

  const handleTaskCreated = (task) => {
    onNotify('Task created successfully', 'success');
    lead.tasks = [...(lead.tasks || []), task];
    setCreateTaskOpen(false);
  };

  const handleTaskUpdated = (task) => {
    onNotify('Task updated successfully', 'success');
    lead.tasks = (lead.tasks || []).map((t) => (t._id === task._id ? task : t));
    setCreateTaskOpen(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
          willChange: isDragging ? 'transform' : 'auto',
          transition: isDragging ? 'none' : 'box-shadow 150ms ease, border-color 150ms ease',
          pointerEvents: isDragging ? 'none' : undefined,
          zIndex: isDragging ? 999 : undefined,
          opacity: isDragging ? 0.92 : 1,
        }}
        {...listeners}
        {...attributes}
        className={`bg-white border rounded-xl p-3.5 group select-none touch-none ${
          isDragging
            ? 'border-indigo-300 shadow-2xl shadow-indigo-200 rotate-[1.5deg] scale-[1.03] cursor-grabbing'
            : 'border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-grab active:cursor-grabbing'
        }`}
      >
        {/* Header row */}
        <div className={`flex items-start justify-between gap-2 ${expanded ? 'mb-3' : 'mb-0'}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-[11px] font-bold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-slate-900">{lead.name}</p>
              <p className="text-[11px] capitalize text-slate-400">{lead.leadType || 'lead'}</p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-0.5" onPointerDown={blockDrag}>
           
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                title="Quick view lead"
              >
                <Eye size={14} />
              </button>
              <button
                type="button"
                onClick={() => onEdit(lead)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
                title="Edit lead"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCreateTaskOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                title="Create task"
              >
                <ListTodo size={14} />
              </button>
            </div>
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse lead details' : 'Expand lead details'}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {!expanded && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
            <span className="truncate text-[10px] font-medium text-slate-600">{fmtPhone(lead.phone)}</span>
            <Pill label={lead.source} cls={SOURCE_CLS[lead.source]} />
            <Pill label={lead.status} cls={STATUS_CLS[lead.status]} />
            {lead.tasks?.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                {lead.tasks.length} task{lead.tasks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {expanded && (
          <>
        {/* Contact details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Phone size={10} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium truncate">{fmtPhone(lead.phone)}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Mail size={10} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.assignedTo?.name && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <User size={10} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{lead.assignedTo.name}</span>
            </div>
          )}
        </div>

        {/* Message */}
        {lead.message && (
          <div className="flex items-start gap-2 mb-3 bg-slate-50 rounded-lg px-2.5 py-2">
            <MessageSquare size={10} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{lead.message}</p>
          </div>
        )}

        {/* Pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          <Pill label={lead.source} cls={SOURCE_CLS[lead.source]} />
          <Pill label={lead.status} cls={STATUS_CLS[lead.status]} />
        </div>

        {/* Footer */}
        <div className="flex items-center pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Calendar size={10} />
            {formatDateIndian(lead.createdAt)}
          </div>
        </div>

        {/* Tasks — block drag so interactions work */}
        <div onPointerDown={blockDrag}>
          <LeadNotes
            leadId={lead._id}
            variant="card"
            initialNotes={lead.notes || []}
            showError={(msg) => onNotify(msg, 'error')}
            showSuccess={(msg) => onNotify(msg, 'success')}
          />
        </div>

        {lead.tasks && lead.tasks.length > 0 && (
          <div className="mt-3" onPointerDown={blockDrag}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Tasks
              </h4>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {lead.tasks.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {lead.tasks.slice(0, 3).map((task) => {
                const statusMeta = {
                  pending:     { cls: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
                  in_progress: { cls: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-400'  },
                  completed:   { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
                  cancelled:   { cls: 'bg-rose-50 text-rose-700 border-rose-200',      dot: 'bg-rose-400'  },
                };
                const priorityDot = {
                  low: 'text-slate-500', medium: 'text-amber-500',
                  high: 'text-orange-500', urgent: 'text-rose-500',
                };
                const s = statusMeta[task.status] ?? statusMeta.pending;
                const isOverdue = task.isOverdue;

                return (
                  <div
                    key={task._id}
                    onClick={() => setEditTask(task)}
                    className="group/task flex items-start gap-2 p-2.5 rounded-lg border border-slate-100
                      bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-sm
                      transition-all cursor-pointer"
                  >
                    {/* Status dot */}
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />

                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 truncate leading-snug">
                        {task.title}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {/* Status pill */}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${s.cls}`}>
                          {task.status?.replace('_', ' ')}
                        </span>

                        {/* Priority */}
                        <span className={`text-[9px] font-semibold uppercase ${priorityDot[task.priority]}`}>
                          {task.priority}
                        </span>

                        {/* Type */}
                        <span className="text-[9px] text-slate-400 capitalize">
                          {task.task_type?.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Due date */}
                      {task.due_date && (
                        <p className={`text-[9px] mt-0.5 ${isOverdue ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                          {isOverdue ? '⚠ Overdue · ' : 'Due '}
                          {new Date(task.due_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>

                    {/* Edit hint */}
                    <Pencil
                      size={10}
                      className="flex-shrink-0 mt-0.5 text-slate-300 group-hover/task:text-indigo-400 transition-colors"
                    />
                  </div>
                );
              })}

              {lead.tasks.length > 3 && (
                <button
                  type="button"
                  onClick={() => onNotify(`${lead.tasks.length - 3} more tasks`, 'info')}
                  className="w-full text-center text-[10px] text-indigo-500 hover:text-indigo-700
                    font-semibold py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  +{lead.tasks.length - 3} more
                </button>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* ── Quick view modal ── */}
      <LeadQuickViewModal
        lead={lead}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />

      <TaskModal
        leadId={lead._id}
        leadName={lead.name}
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onCreated={handleTaskCreated}
      />

      {/* ── Edit task modal ── */}
      <TaskModal
        leadId={lead._id}
        leadName={lead.name}
        task={editTask}                          
        isOpen={Boolean(editTask)}
        onClose={() => setEditTask(null)}
        onUpdated={handleTaskUpdated}
      />
    </>
  );
};

export default LeadCard;
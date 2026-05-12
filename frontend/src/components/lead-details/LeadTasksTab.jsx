import { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Plus,
  Phone,
  Mail,
  Video,
  Users,
  MessageSquare,
  MapPin,
  Zap,
  RotateCcw,
  Calendar,
  Clock,
  Flag,
  CheckCircle,
  AlertCircle,
  Trash2,
  Pencil,
  ListTodo,
  Timer,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '../common/ui/Card';
import Table from '../common/ui/Table';
import Button from '../common/ui/Button';
import Chip from '../common/ui/Chip';
import TaskModal from '../common/TaskModal';
import { UiSectionTitle } from '../common/ui/Typography';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { fetchCalendarTasks } from '../../store/tasksSlice';

const TASK_TYPES = {
  call: { label: 'Call', Icon: Phone, color: 'bg-blue-100 text-blue-800' },
  email: { label: 'Email', Icon: Mail, color: 'bg-purple-100 text-purple-800' },
  meeting: { label: 'Meeting', Icon: Users, color: 'bg-indigo-100 text-indigo-800' },
  demo: { label: 'Demo', Icon: Video, color: 'bg-pink-100 text-pink-800' },
  whatsapp: { label: 'WhatsApp', Icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  visit: { label: 'Visit', Icon: MapPin, color: 'bg-orange-100 text-orange-800' },
  follow_up: { label: 'Follow-up', Icon: RotateCcw, color: 'bg-yellow-100 text-yellow-800' },
  custom: { label: 'Custom', Icon: Zap, color: 'bg-gray-100 text-gray-800' },
};

const STATUSES = {
  pending: { label: 'Pending', Icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', Icon: Timer, color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', Icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', Icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  overdue: { label: 'Overdue', Icon: AlertCircle, color: 'bg-orange-100 text-orange-800' },
};

const PRIORITIES = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const isOverdue = (task) =>
  task.due_date &&
  new Date(task.due_date) < new Date() &&
  !['completed', 'cancelled'].includes(task.status);

/**
 * Tasks for a single lead: server-paginated table + shared TaskModal (create / edit).
 */
const LeadTasksTab = ({ leadId, leadName, showError, showSuccess }) => {
  const dispatch = useDispatch();
  const [listRev, setListRev] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const bumpList = useCallback(() => {
    setListRev((n) => n + 1);
    dispatch(fetchCalendarTasks());
  }, [dispatch]);

  const openCreateModal = useCallback(() => {
    setEditingTask(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((task) => {
    setEditingTask(task);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingTask(null);
    bumpList();
  }, [bumpList]);

  const handleDelete = useCallback(
    async (task) => {
      if (!window.confirm(`Delete task "${task.title}"?`)) return;
      try {
        await api.delete(API_ROUTES.tasks.delete(task._id));
        showSuccess?.('Task deleted');
        bumpList();
      } catch (err) {
        showError?.(err?.message || 'Failed to delete task');
      }
    },
    [bumpList, showError, showSuccess]
  );

  const fetchLeadTasks = useCallback(
    async ({ page, limit, sortKey, sortDirection }) => {
      const allowed = ['title', 'due_date', 'status', 'priority', 'task_type', 'assigned_to', 'createdAt'];
      const sortBy = allowed.includes(sortKey) ? sortKey : 'createdAt';
      const sortOrder = sortDirection === 'asc' ? 'asc' : 'desc';
      const res = await api.get(API_ROUTES.tasks.list, {
        params: {
          lead_id: leadId,
          page,
          limit,
          sortBy,
          sortOrder,
        },
      });
      if (!res?.success) {
        throw new Error(res?.message || 'Failed to load tasks');
      }
      const data = res?.data || {};
      const rows = data.tasks || [];
      return {
        data: rows,
        total: data.pagination?.total ?? rows.length,
      };
    },
    [leadId]
  );

  const queryParams = useMemo(() => ({ leadId: String(leadId), listRev }), [leadId, listRev]);

  const columns = useMemo(
    () => [
      {
        key: 'title',
        sortKey: 'title',
        sortable: true,
        header: 'Title',
        render: (task) => (
          <div className="flex items-center gap-2">
            {isOverdue(task) ? <AlertCircle className="h-4 w-4 shrink-0 text-orange-500" /> : null}
            <span
              className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}
            >
              {task.title}
            </span>
          </div>
        ),
      },
      {
        key: 'task_type',
        sortKey: 'task_type',
        sortable: true,
        header: 'Type',
        render: (task) => {
          const type = TASK_TYPES[task.task_type] || TASK_TYPES.custom;
          return <Chip label={type.label} variant="custom" className={type.color} />;
        },
      },
      {
        key: 'status',
        sortKey: 'status',
        sortable: true,
        header: 'Status',
        render: (task) => {
          const status = isOverdue(task) ? STATUSES.overdue : STATUSES[task.status] || STATUSES.pending;
          return <Chip label={status.label} variant="custom" className={status.color} />;
        },
      },
      {
        key: 'priority',
        sortKey: 'priority',
        sortable: true,
        header: 'Priority',
        render: (task) => (
          <div className="flex items-center gap-1">
            <Flag className="h-3 w-3 text-gray-400" />
            <span className={`text-sm font-medium ${PRIORITIES[task.priority]?.color || PRIORITIES.medium.color}`}>
              {PRIORITIES[task.priority]?.label || 'Medium'}
            </span>
          </div>
        ),
      },
      {
        key: 'due_date',
        sortKey: 'due_date',
        sortable: true,
        header: 'Due',
        render: (task) => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
            <span className={isOverdue(task) ? 'font-medium text-orange-600' : 'text-gray-600'}>
              {formatDate(task.due_date)}
            </span>
          </div>
        ),
      },
      {
        key: 'assigned_to',
        sortKey: 'assigned_to',
        sortable: true,
        header: 'Assigned to',
        render: (task) => <span className="text-gray-700">{task.assigned_to?.name || '—'}</span>,
      },
      {
        key: 'action',
        sortable: false,
        header: 'Actions',
        cellClassName: 'text-right',
        render: (task) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              iconOnly
              startIcon={<Pencil className="h-4 w-4" />}
              onClick={() => openEditModal(task)}
              title="Edit task"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              iconOnly
              startIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => handleDelete(task)}
              title="Delete task"
            />
          </div>
        ),
      },
    ],
    [openEditModal, handleDelete]
  );

  return (
    <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-gray-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-violet-600" />
          <UiSectionTitle>Tasks</UiSectionTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => bumpList()}>
            Refresh
          </Button>
          <Button type="button" size="sm" startIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            New task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table
          key={`lead-tasks-${leadId}-${listRev}`}
          columns={columns}
          apiFunction={fetchLeadTasks}
          queryParams={queryParams}
          emptyMessage="No tasks for this lead yet. Create one to follow up."
          rowKey="_id"
          framed={false}
          defaultPageSize={20}
          pageSizeOptions={[10, 20, 50]}
        />
      </CardContent>

      {showModal ? (
        <TaskModal
          isOpen={showModal}
          onClose={handleModalClose}
          leadId={leadId}
          leadName={leadName}
          task={editingTask}
        />
      ) : null}
    </Card>
  );
};

export default LeadTasksTab;

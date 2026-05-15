import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import Table from '../../components/common/ui/Table';
import Button from '../../components/common/ui/Button';
import Chip from '../../components/common/ui/Chip';
import TaskModal from '../../components/common/TaskModal';
import Input from '../../components/common/ui/Input';
import SearchableSelect from '../../components/common/ui/SearchableSelect';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { fetchTasks, fetchCalendarTasks } from '../../store/tasksSlice';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import { fetchTeamAssignableUsers } from '../../utils/fetchTeamAssignableUsers';
import { UiPageTitle, UiSectionTitle, UiPageDescription, UiFieldLabel } from '../../components/common/ui/Typography';
import {
  Plus,
  Phone, Mail, Video, Users, MessageSquare, MapPin, Zap, RotateCcw,
  CalendarDays, Clock, Flag, CheckCircle, Circle, AlertCircle,
  Trash2, Pencil, Calendar, CheckCheck,
  ListTodo, TrendingUp, Timer,
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────── */
const TASK_TYPES = {
  call: { label: 'Call', Icon: Phone, color: 'bg-blue-100 text-blue-800' },
  email: { label: 'Email', Icon: Mail, color: 'bg-purple-100 text-purple-800' },
  meeting: { label: 'Meeting', Icon: Users, color: 'bg-indigo-100 text-indigo-800' },
  demo: { label: 'Demo', Icon: Video, color: 'bg-pink-100 text-pink-800' },
  whatsapp: { label: 'WhatsApp', Icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  visit: { label: 'Visit', Icon: MapPin, color: 'bg-orange-100 text-orange-800' },
  follow_up: { label: 'Follow-up', Icon: RotateCcw, color: 'bg-yellow-100 text-yellow-800' },
  custom: { label: 'Custom', Icon: Zap, color: 'bg-gray-100 text-gray-800' }
};

const STAT_CARDS = [
  { key: 'totalTasks',      label: 'Total',       Icon: ListTodo,    color: 'from-slate-400 to-slate-500' },
  { key: 'pendingTasks',    label: 'Pending',     Icon: Circle,      color: 'from-amber-400 to-orange-400' },
  { key: 'inProgressTasks', label: 'In Progress', Icon: TrendingUp,  color: 'from-blue-400 to-indigo-500' },
  { key: 'completedTasks',  label: 'Completed',   Icon: CheckCheck,  color: 'from-emerald-400 to-teal-500' },
  { key: 'overdueTasks',    label: 'Overdue',     Icon: AlertCircle, color: 'from-rose-400 to-pink-500' },
  { key: 'todayTasks',      label: 'Due Today',   Icon: CalendarDays,color: 'from-violet-400 to-purple-500' },
];

const STATUSES = {
  pending: { label: 'Pending', Icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', Icon: Timer, color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', Icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', Icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  overdue: { label: 'Overdue', Icon: AlertCircle, color: 'bg-orange-100 text-orange-800' }
};

const PRIORITIES = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' }
};

const TASK_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...Object.entries(STATUSES).map(([key, s]) => ({ value: key, label: s.label })),
];

const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'All Priorities' },
  ...Object.entries(PRIORITIES).map(([key, p]) => ({ value: key, label: p.label })),
];

const TASK_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  ...Object.entries(TASK_TYPES).map(([key, t]) => ({ value: key, label: t.label })),
];

const DUE_DATE_FILTER_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
];

const SCOPE_FILTER_OPTIONS = [
  { value: '', label: 'All (my work + team)' },
  { value: 'mine', label: 'Assigned / created by me' },
  { value: 'team', label: 'My team only' },
];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
const StatCard = ({ Icon, label, value, color, loading }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-lg dark:opacity-75`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-75 mb-1">{label}</p>
        {loading
          ? <div className="h-7 w-10 bg-white/20 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-black">{value ?? 0}</p>
        }
      </div>
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon size={18} />
      </div>
    </div>
    {/* decorative circle */}
    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
  </div>
);
const TasksPage = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const isTeamManager = user?.role === USER_ROLES.TEAM_MANAGER;
  const { tasks, stats, loading } = useSelector((s) => s.tasks);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    task_type: '',
    due_date: '',
    scope: '',
    assigned_to: '',
    team_id: '',
  });
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);

  const assigneeFilterOptions = useMemo(
    () => [
      { value: '', label: 'All assignees' },
      ...assigneeOptions.map((u) => ({ value: String(u._id), label: u.name || String(u._id) })),
    ],
    [assigneeOptions]
  );

  const teamFilterOptions = useMemo(
    () => [
      { value: '', label: 'All teams' },
      ...teamOptions.map((t) => ({ value: String(t._id), label: t.name || 'Team' })),
    ],
    [teamOptions]
  );

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(API_ROUTES.teams.list, { params: { limit: 200, status: 'active' } });
        const list = res?.data?.teams || res?.data || [];
        if (!cancelled) setTeamOptions(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setTeamOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && !isTeamManager) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchTeamAssignableUsers();
        if (!cancelled) setAssigneeOptions(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAssigneeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isTeamManager]);

  useEffect(() => {
    dispatch(fetchTasks({ search, filters }));
  }, [dispatch, search, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      try {
        await api.delete(API_ROUTES.tasks.delete(task._id));
        dispatch(fetchTasks({ search, filters }));
        dispatch(
          fetchCalendarTasks({
            ...(filters.scope ? { scope: filters.scope } : {}),
            ...(filters.assigned_to ? { assigned_to: filters.assigned_to } : {}),
            ...(filters.team_id ? { team_id: filters.team_id } : {}),
          }),
        );
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTask(null);
    dispatch(fetchTasks({ search, filters }));
    dispatch(
      fetchCalendarTasks({
        ...(filters.scope ? { scope: filters.scope } : {}),
        ...(filters.assigned_to ? { assigned_to: filters.assigned_to } : {}),
        ...(filters.team_id ? { team_id: filters.team_id } : {}),
      }),
    );
  };

  const isOverdue = (task) => {
    return task.due_date && 
           new Date(task.due_date) < new Date() && 
           !['completed', 'cancelled'].includes(task.status);
  };

  const columns = [
    {
      key: 'title',
      sortKey: 'title',
      sortable: true,
      header: 'Title',
      render: (task) => (
        <div className="flex items-center gap-2">
          {isOverdue(task) && (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          )}
          <span className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </span>
        </div>
      )
    },
    {
      key: 'task_type',
      sortKey: 'task_type',
      sortable: true,
      header: 'Type',
      render: (task) => {
        const type = TASK_TYPES[task.task_type] || TASK_TYPES.custom;
        return (
          <Chip 
            label={type.label}
            variant="custom"
            className={type.color}
          />
        );
      }
    },
    {
      key: 'status',
      sortKey: 'status',
      sortable: true,
      header: 'Status',
      render: (task) => {
        const status = isOverdue(task) ? STATUSES.overdue : (STATUSES[task.status] || STATUSES.pending);
        return (
          <Chip 
            label={status.label}
            variant="custom"
            className={status.color}
          />
        );
      }
    },
    {
      key: 'priority',
      sortKey: 'priority',
      sortable: true,
      header: 'Priority',
      render: (task) => (
        <div className="flex items-center gap-1">
          <Flag className="h-3 w-3" />
          <span className={`text-sm font-medium ${PRIORITIES[task.priority]?.color || PRIORITIES.medium.color}`}>
            {PRIORITIES[task.priority]?.label || 'Medium'}
          </span>
        </div>
      )
    },
    {
      key: 'due_date',
      sortKey: 'due_date',
      sortable: true,
      header: 'Due Date',
      render: (task) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className={isOverdue(task) ? 'text-orange-600 font-medium' : 'text-gray-600'}>
            {formatDate(task.due_date)}
          </span>
        </div>
      )
    },
    {
      key: 'lead_id',
      sortKey: 'lead_id',
      sortable: true,
      header: 'Lead',
      render: (task) => task.lead_id?.name || '-'
    },
    {
      key: 'assigned_to',
      sortKey: 'assigned_to',
      sortable: true,
      header: 'Assigned To',
      render: (task) => task.assigned_to?.name || 'Unassigned'
    },
    {
      key: 'action',
      header: 'Actions',
      render: (task) => (
        <div className="flex items-center gap-1">
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
      )
    }
  ];

  // const statCards = [
  //   { label: 'Total', value: stats.totalTasks || 0, color: 'bg-blue-500' },
  //   { label: 'Pending', value: stats.pendingTasks || 0, color: 'bg-yellow-500' },
  //   { label: 'In Progress', value: stats.inProgressTasks || 0, color: 'bg-blue-500' },
  //   { label: 'Completed', value: stats.completedTasks || 0, color: 'bg-green-500' },
  //   { label: 'Overdue', value: stats.overdueTasks || 0, color: 'bg-orange-500' },
  //   { label: 'Due Today', value: stats.todayTasks || 0, color: 'bg-purple-500' }
  // ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UiPageTitle>Tasks</UiPageTitle>
            <UiPageDescription>
              Manage and track all tasks across your leads and team
            </UiPageDescription>
          </div>
          <Button
            size="sm"
            onClick={openCreateModal}
            startIcon={<Plus className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ key, label, Icon, color }) => (
          <StatCard
            key={key}
            Icon={Icon}
            label={label}
            value={stats[key]}
            color={color}
            loading={false}
          />
        ))}
      </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <UiSectionTitle>Filters</UiSectionTitle>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-5">
              <Input
                label="Search"
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="w-full">
                <label className="mb-1 block">
                  <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                    Status
                  </UiFieldLabel>
                </label>
                <SearchableSelect
                  name="status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                  options={TASK_STATUS_FILTER_OPTIONS}
                  className="w-full"
                />
              </div>
              <div className="w-full">
                <label className="mb-1 block">
                  <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                    Priority
                  </UiFieldLabel>
                </label>
                <SearchableSelect
                  name="priority"
                  value={filters.priority}
                  onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                  options={PRIORITY_FILTER_OPTIONS}
                  className="w-full"
                />
              </div>
              <div className="w-full">
                <label className="mb-1 block">
                  <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                    Type
                  </UiFieldLabel>
                </label>
                <SearchableSelect
                  name="task_type"
                  value={filters.task_type}
                  onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                  options={TASK_TYPE_FILTER_OPTIONS}
                  className="w-full"
                />
              </div>
              <div className="w-full">
                <label className="mb-1 block">
                  <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                    Due Date
                  </UiFieldLabel>
                </label>
                <SearchableSelect
                  name="due_date"
                  value={filters.due_date}
                  onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                  options={DUE_DATE_FILTER_OPTIONS}
                  className="w-full"
                />
              </div>
            </div>

            {(isAdmin || isTeamManager) && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {isTeamManager && (
                  <div className="w-full">
                    <label className="mb-1 block">
                      <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                        View
                      </UiFieldLabel>
                    </label>
                    <SearchableSelect
                      name="scope"
                      value={filters.scope}
                      onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                      options={SCOPE_FILTER_OPTIONS}
                      className="w-full"
                    />
                  </div>
                )}
                <div className="w-full">
                  <label className="mb-1 block">
                    <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                      Assignee
                    </UiFieldLabel>
                  </label>
                  <SearchableSelect
                    name="assigned_to"
                    value={filters.assigned_to}
                    onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                    options={assigneeFilterOptions}
                    className="w-full"
                  />
                </div>
                {isAdmin && (
                  <div className="w-full">
                    <label className="mb-1 block">
                      <UiFieldLabel className="normal-case tracking-normal text-gray-700 dark:text-slate-300">
                        Team
                      </UiFieldLabel>
                    </label>
                    <SearchableSelect
                      name="team_id"
                      value={filters.team_id}
                      onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
                      options={teamFilterOptions}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <UiSectionTitle>Tasks ({tasks.length})</UiSectionTitle>
          </CardHeader>
          <CardContent>
            <Table
              data={tasks}
              columns={columns}
              loading={loading}
              emptyMessage="No tasks found"
            />
          </CardContent>
        </Card>

        {/* Task Modal */}
        {showModal && (
          <TaskModal
            isOpen={showModal}
            onClose={handleModalClose}
            task={editingTask}
            onCreated={handleModalClose}
            onUpdated={handleModalClose}
          />
        )}
      </div>
    </div>
  );
};

export default TasksPage;
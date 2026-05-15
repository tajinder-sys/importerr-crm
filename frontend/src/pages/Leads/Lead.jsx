import { useState, useCallback, useEffect, startTransition } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { fetchTeamAssignableUsers } from '../../utils/fetchTeamAssignableUsers';
import { enrichPipelinesWithStages } from '../../utils/enrichPipelinesWithStages';
import { formatIndianPhoneInput, getPhonePayload, validatePhone } from '../../utils/helpers';
import { getChipVariant } from '../../utils/chipConstants';

// Common components
import Modal from '../../components/common/ui/Modal';
import Snackbar from '../../components/common/ui/Snackbar';
import LeadForm from '../../components/leads/LeadForm';
import Table from '../../components/common/ui/Table';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import Chip from '../../components/common/ui/Chip';
import Button from '../../components/common/ui/Button';
import { Eye, Pencil } from 'lucide-react';

import LeadsHeader from './LeadsHeader';
import LeadsSlaDueBanner from './comp/LeadsSlaDueBanner';
import KanbanBoard from './comp/KanbanBoard';
import useKanban from './hooks/useKanban';
import { TASK_PRIORITY_LEVELS, USER_ROLES } from '../../utils/constants';

const DEFAULT_LEAD_FORM = {
  name: '',
  email: '',
  phone: '',
  source: 'importerr_inquiry',
  assignedTo: '',
  priority: TASK_PRIORITY_LEVELS.LOW,
  leadType: 'guest',
  status: 'new',
  pipelineId: '',
  stageId: '',
  message: '',
};

const Leads = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeamManager = user?.role === 'team_manager';
  const showAssigneeFilters = isAdmin || isTeamManager;
  const canManageAssignment = isAdmin || isTeamManager;

  const [assigneeFilter, setAssigneeFilter] = useState('');

  const {
    pipelines,
    selectedPipelineId,
    activeStages,
    leadsByStage,
    stageKanbanMeta,
    loadingStages,
    setSelectedPipelineId,
    refreshStage,
    refreshAllStages,
    snackbar,
    setSnackbar,
    notify,
    setLeadsByStage,
    setStageKanbanMeta,
    goToStagePage,
    updateStageListQuery,
  } = useKanban(showAssigneeFilters ? assigneeFilter : '');
  /* ── View toggle (kanban / table) ───────────────────── */
  const [view, setView] = useState('kanban');

  /* ── Lead modal state ───────────────────────────────── */
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead]     = useState(null);
  const [leadForm, setLeadForm]           = useState(DEFAULT_LEAD_FORM);
  const [createError, setCreateError]     = useState('');
  const [saving, setSaving]               = useState(false);
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [pipelinesForLeadForm, setPipelinesForLeadForm] = useState([]);
  /** Admin header assignee filter — id + name from GET /users/team-assignable */
  const [teamRosterForFilters, setTeamRosterForFilters] = useState([]);
  // stageId to pre-fill when adding from a column's + button
  const [defaultStageId, setDefaultStageId] = useState('');

  /* ── Table state (for table view) ───────────────────── */
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const loadMembersForPipeline = useCallback(
    async (pipelineId, ensureUser = null) => {
      if (!canManageAssignment || !pipelineId) {
        setAssignableMembers([]);
        return;
      }
      try {
        const list = await fetchTeamAssignableUsers({ pipelineId: String(pipelineId) });
        const base = (list || []).map((u) => ({
          _id: u._id,
          name: u.name || '',
          email: '',
        }));
        if (ensureUser?._id && !base.some((m) => String(m._id) === String(ensureUser._id))) {
          base.push({
            _id: ensureUser._id,
            name: ensureUser.name || '',
            email: ensureUser.email || '',
          });
        }
        setAssignableMembers(base);
      } catch {
        setAssignableMembers([]);
      }
    },
    [canManageAssignment],
  );

  useEffect(() => {
    if (!showLeadModal || !pipelines?.length) {
      startTransition(() => setPipelinesForLeadForm([]));
      return undefined;
    }
    let cancelled = false;
    enrichPipelinesWithStages(pipelines).then((list) => {
      if (!cancelled) setPipelinesForLeadForm(list);
    });
    return () => {
      cancelled = true;
    };
  }, [showLeadModal, pipelines]);

  useEffect(() => {
    if (!showAssigneeFilters) {
      startTransition(() => setTeamRosterForFilters([]));
      return undefined;
    }
    fetchTeamAssignableUsers()
      .then(setTeamRosterForFilters)
      .catch(() => setTeamRosterForFilters([]));
    return undefined;
  }, [showAssigneeFilters]);

  useEffect(() => {
    if (!showLeadModal || !canManageAssignment) return undefined;
    if (!leadForm.pipelineId) {
      startTransition(() => setAssignableMembers([]));
      return undefined;
    }
    const ensureUser = editingLead?.assignedTo || null;
    const run = async () => { await loadMembersForPipeline(leadForm.pipelineId, ensureUser); };
    run();
    return undefined;
  }, [
    showLeadModal,
    canManageAssignment,
    leadForm.pipelineId,
    loadMembersForPipeline,
    editingLead?._id,
    editingLead?.assignedTo?._id,
    editingLead?.assignedTo
  ]);

  /* ── Open create lead modal ─────────────────────────── */
  const openCreateLead = useCallback(
    async (pipelineId = '', stageId = '') => {
      setEditingLead(null);
      setCreateError('');
      setDefaultStageId(stageId);
      setLeadForm({
        ...DEFAULT_LEAD_FORM,
        pipelineId: pipelineId || selectedPipelineId || '',
        stageId,
      });
      setShowLeadModal(true);
    },
    [selectedPipelineId],
  );

  /* ── Open edit lead modal ───────────────────────────── */
  const openEditLead = useCallback(async (lead) => {
    setCreateError('');
    setEditingLead(lead);
    setDefaultStageId(lead?.stageId?._id || '');
    setLeadForm({
      name: lead?.name || '',
      email: lead?.email || '',
      phone: formatIndianPhoneInput(lead?.phone || ''),
      source: lead?.source || 'importerr_inquiry',
      assignedTo: lead?.assignedTo?._id ? String(lead.assignedTo._id) : '',
      priority: lead?.priority || TASK_PRIORITY_LEVELS.LOW,
      leadType: lead?.leadType || 'guest',
      status: lead?.status || 'new',
      pipelineId: lead.pipelineId?._id || '',
      stageId: lead.stageId?._id || '',
      message: lead?.message || '',
    });
    setShowLeadModal(true);
  }, []);

  /* ── Open view lead ─────────────────────────────────── */
  const openViewLead = useCallback((lead) => {
    window.open(`/leads/${lead._id}`, '_blank', 'noopener,noreferrer');
  }, []);

  const closeModal = () => {
    setShowLeadModal(false);
    setEditingLead(null);
    setLeadForm(DEFAULT_LEAD_FORM);
    setCreateError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLeadForm((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatIndianPhoneInput(value) : value,
    }));
  };

  /* ── Validate phone ─────────────────────────────────── */
  const validateAndGetPhone = () => {
    const normalized = getPhonePayload(leadForm.phone);
    if (!normalized || !validatePhone(normalized)) {
      setCreateError('Enter a valid mobile number');
      return null;
    }
    return normalized;
  };

  /* ── Create lead ────────────────────────────────────── */
  const handleCreateLead = async (e) => {
    e.preventDefault();
    setCreateError('');
    const phone = validateAndGetPhone();
    if (!phone) return;
    setSaving(true);
    try {
      await api.post(API_ROUTES.leads.create, {
        name:     leadForm.name.trim(),
        email:    leadForm.email.trim(),
        phone,
        source:   leadForm.source,
        leadType: leadForm.leadType,
        ...leadForm,
      });
      notify('Lead created successfully');
      closeModal();
      // Refresh the stage it was added to, or all stages
      if (defaultStageId) refreshStage(defaultStageId);
      else refreshAllStages();
      setTableRefreshKey((k) => k + 1);
    } catch (err) {
      setCreateError(err?.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  /* ── Update lead ────────────────────────────────────── */
  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!editingLead?._id) return;
    setCreateError('');
    const phone = validateAndGetPhone();
    if (!phone) return;
    setSaving(true);
    try {
      await api.put(API_ROUTES.leads.update(editingLead._id), {
        name:     leadForm.name.trim(),
        email:    leadForm.email.trim(),
        phone,
        source:   leadForm.source,
        leadType: leadForm.leadType,
        status:   leadForm.status,
        ...leadForm,
      });
      notify('Lead updated successfully');
      closeModal();
      // Refresh the stage this lead belongs to
      const stageId = editingLead?.stageId?._id;
      if (stageId) refreshStage(stageId);
      else refreshAllStages();
      setTableRefreshKey((k) => k + 1);
    } catch (err) {
      setCreateError(err?.message || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  /* ── Table fetch function ───────────────────────────── */
  const fetchLeadsForTable = useCallback(
    async ({ page, limit, sortKey, sortDirection, assignedTo }) => {
      const res = await api.get(API_ROUTES.leads.list, {
        params: {
          page, limit,
          sortBy: sortKey || 'priority',
          sortOrder: sortDirection || 'desc',
          ...(selectedPipelineId ? { pipelineId: selectedPipelineId } : {}),
          ...(assignedTo ? { assignedTo } : {}),
        },
      });
      return {
        data:  res?.data?.leads || [],
        total: res?.data?.pagination?.total || 0,
      };
    },
    [selectedPipelineId]
  );

  /* ── Table columns ──────────────────────────────────── */
  const tableColumns = [
    { key: 'name', sortKey: 'name', sortable: true, header: 'Lead Name',
      render: (l) => <span className="font-semibold text-slate-800">{l.name}</span> },
    { key: 'phone', header: 'Phone',
      render: (l) => <span className="text-sm text-slate-600">{l.phone || '-'}</span> },
    { key: 'email', header: 'Email',
      render: (l) => <span className="text-sm text-slate-600 truncate max-w-[180px] block">{l.email || '-'}</span> },
    { key: 'assignedTo', header: 'Assigned To',
      render: (l) => l?.assignedTo?.name || '-' },
    { key: 'stageId', header: 'Stage',
      render: (l) => l?.stageId ? (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.stageId.color || '#6b7280' }} />
          <span className="text-sm">{l.stageId.name}</span>
        </div>
      ) : '-' },
    { key: 'source', header: 'Source',
      render: (l) => <Chip label={l.source} variant={getChipVariant('SOURCE', l.source)} /> },
    { key: 'priority', sortKey: 'priority', sortable: true, header: 'Priority',
      render: (l) => <Chip label={l.priority || TASK_PRIORITY_LEVELS.LOW} variant={getChipVariant('PRIORITY', l.priority || TASK_PRIORITY_LEVELS.LOW)} /> },
    { key: 'status', header: 'Status',
      render: (l) => <Chip label={l.status} variant={getChipVariant('STATUS', l.status)} /> },
    { key: 'action', header: '',
      render: (l) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly startIcon={<Eye className="h-4 w-4" />}
            onClick={() => openViewLead(l)} title="View" />
          <Button size="sm" variant="ghost" iconOnly startIcon={<Pencil className="h-4 w-4" />}
            onClick={() => openEditLead(l)} title="Edit" />
        </div>
      ) },
  ];

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-full space-y-4">

        {/* Page header */}
        <LeadsSlaDueBanner
          userId={
            user?.role === USER_ROLES.TEAM_MEMBER || user?.role === USER_ROLES.TEAM_MANAGER
              ? user?._id || user?.id
              : null
          }
        />

        <LeadsHeader
          onCreateLead={() => openCreateLead()}
          view={view}
          onViewChange={setView}
          pipelines={pipelines}
          selectedPipeline={selectedPipelineId}
          onSelect={setSelectedPipelineId}
          showAssigneeFilter={showAssigneeFilters}
          assignableMembers={teamRosterForFilters}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
        />

        {/* ── Kanban view ── */}
        {view === 'kanban' && (
          <KanbanBoard
            stages={activeStages}
            leadsByStage={leadsByStage}
            stageKanbanMeta={stageKanbanMeta}
            setLeadsByStage={setLeadsByStage}
            setStageKanbanMeta={setStageKanbanMeta}
            goToStagePage={goToStagePage}
            updateStageListQuery={updateStageListQuery}
            isLoading={loadingStages}
            onAddLead={openCreateLead}
            onView={openViewLead}
            onEdit={openEditLead}
            onNotify={notify}
            isAdmin={showAssigneeFilters}
            slaAdmin={isAdmin}
          />
        )}

        {/* ── Table view ── */}
        {view === 'table' && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-slate-100">
              <UiSectionTitle>All Leads</UiSectionTitle>
            </CardHeader>
            <CardContent>
              <Table
                columns={tableColumns}
                apiFunction={fetchLeadsForTable}
                queryParams={{
                  refreshKey: tableRefreshKey,
                  pipelineId: selectedPipelineId,
                  ...(showAssigneeFilters && assigneeFilter ? { assignedTo: assigneeFilter } : {}),
                }}
                rowKey="_id"
                emptyMessage="No leads found."
                defaultPageSize={10}
                pageSizeOptions={[10, 20, 50]}
                framed={false}
              />
            </CardContent>
          </Card>
        )}

      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        isOpen={showLeadModal}
        onClose={closeModal}
        title={editingLead ? 'Edit Lead' : 'Create Lead'}
        size="lg"
      >
        <LeadForm
          values={leadForm}
          onChange={handleFormChange}
          assignableMembers={assignableMembers}
          canManageLeadAssignment={canManageAssignment}
          error={createError}
          onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
          onCancel={closeModal}
          loading={saving}
          pipelines={pipelinesForLeadForm.length ? pipelinesForLeadForm : pipelines}
          submitLabel={editingLead ? 'Update Lead' : 'Create Lead'}
        />
      </Modal>

      {/* ── Toast ── */}
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default Leads;
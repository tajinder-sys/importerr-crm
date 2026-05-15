import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { fetchTeamAssignableUsers } from '../../utils/fetchTeamAssignableUsers';
import { enrichPipelinesWithStages } from '../../utils/enrichPipelinesWithStages';
import { formatIndianPhoneInput, getPhonePayload, validatePhone } from '../../utils/helpers';
import PageHeader from '../../components/common/ui/PageHeader';
import Table from '../../components/common/ui/Table';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import Chip from '../../components/common/ui/Chip';
import Button from '../../components/common/ui/Button';
import Modal from '../../components/common/ui/Modal';
import Snackbar from '../../components/common/ui/Snackbar';
import LeadForm from '../../components/leads/LeadForm';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES, TASK_PRIORITY_LEVELS } from '../../utils/constants';
import { getChipVariant } from '../../utils/chipConstants';

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

const UnassignedLeads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const canManageAssignment = isAdmin || user?.role === USER_ROLES.TEAM_MANAGER;

  const [pipelines, setPipelines] = useState([]);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm, setLeadForm] = useState(DEFAULT_LEAD_FORM);
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [pipelinesForLeadForm, setPipelinesForLeadForm] = useState([]);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const notify = useCallback((message, type = 'success') => {
    setSnackbar({ open: true, message, type });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(API_ROUTES.pipelines.list, {
          params: { isActive: true, limit: 200 },
        });
        const list = res?.data?.pipelines || res?.data || [];
        if (!cancelled) setPipelines(list);
      } catch {
        if (!cancelled) setPipelines([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!showLeadModal || !canManageAssignment) return undefined;
    if (!leadForm.pipelineId) {
      startTransition(() => setAssignableMembers([]));
      return undefined;
    }
    const ensureUser = editingLead?.assignedTo || null;
    const run = async () => {
      await loadMembersForPipeline(leadForm.pipelineId, ensureUser);
    };
    run();
    return undefined;
  }, [
    showLeadModal,
    canManageAssignment,
    leadForm.pipelineId,
    loadMembersForPipeline,
    editingLead?._id,
    editingLead?.assignedTo?._id,
    editingLead?.assignedTo,
  ]);

  const openEditLead = useCallback(async (lead) => {
    setCreateError('');
    setEditingLead(lead);
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

  const validateAndGetPhone = () => {
    const normalized = getPhonePayload(leadForm.phone);
    if (!normalized || !validatePhone(normalized)) {
      setCreateError('Enter a valid mobile number');
      return null;
    }
    return normalized;
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    if (!editingLead?._id) return;
    setCreateError('');
    const phone = validateAndGetPhone();
    if (!phone) return;
    setSaving(true);
    try {
      await api.put(API_ROUTES.leads.update(editingLead._id), {
        name: leadForm.name.trim(),
        email: leadForm.email.trim(),
        phone,
        source: leadForm.source,
        leadType: leadForm.leadType,
        status: leadForm.status,
        ...leadForm,
      });
      notify('Lead updated successfully');
      closeModal();
      setTableRefreshKey((k) => k + 1);
    } catch (err) {
      setCreateError(err?.message || 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const fetchUnassigned = useCallback(async ({ page, limit, sortKey, sortDirection }) => {
    const res = await api.get(API_ROUTES.leads.unassigned, {
      params: {
        page,
        limit,
        ...(sortKey
          ? { sortBy: sortKey, sortOrder: sortDirection || 'desc' }
          : { sortBy: 'createdAt', sortOrder: 'desc' }),
      },
    });
    return {
      data: res?.data?.leads || [],
      total: res?.data?.pagination?.total || 0,
    };
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        sortKey: 'name',
        sortable: true,
        header: 'Lead Name',
        render: (l) => <span className="font-semibold text-slate-800 dark:text-slate-100">{l.name || '—'}</span>,
      },
      {
        key: 'phone',
        header: 'Phone',
        render: (l) => <span className="text-sm text-slate-600 dark:text-slate-300">{formatIndianPhoneInput(l.phone) || '—'}</span>,
      },
      {
        key: 'email',
        header: 'Email',
        render: (l) => (
          <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[180px] block">
            {l.email || '—'}
          </span>
        ),
      },
      {
        key: 'pipelineId',
        header: 'Pipeline',
        render: (l) => <span className="text-sm text-slate-600 dark:text-slate-300">{l?.pipelineId?.name || '—'}</span>,
      },
      {
        key: 'assignedTo',
        header: 'Assigned To',
        render: (l) => l?.assignedTo?.name || '—',
      },
      {
        key: 'stageId',
        header: 'Stage',
        render: (l) =>
          l?.stageId ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.stageId.color || '#6b7280' }} />
              <span className="text-sm">{l.stageId.name}</span>
            </div>
          ) : (
            '—'
          ),
      },
      {
        key: 'source',
        header: 'Source',
        render: (l) => <Chip label={l.source} variant={getChipVariant('SOURCE', l.source)} />,
      },
      {
        key: 'status',
        header: 'Status',
        render: (l) => <Chip label={l.status} variant={getChipVariant('STATUS', l.status)} />,
      },
      {
        key: 'action',
        header: '',
        render: (l) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              startIcon={<Eye className="h-4 w-4" />}
              onClick={() => navigate(`/leads/${l._id}`)}
              title="View lead"
            />
            <Button
              size="sm"
              variant="ghost"
              iconOnly
              startIcon={<Pencil className="h-4 w-4" />}
              onClick={() => openEditLead(l)}
              title="Edit lead"
            />
          </div>
        ),
      },
    ],
    [navigate, openEditLead],
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-4">
        <PageHeader
          title="Unassigned Leads"
          description={
            isAdmin
              ? 'Leads with no pipeline or no assignee.'
              : 'Leads in your team pipelines with no assignee.'
          }
        />
        <Card className="rounded-2xl border-slate-200 shadow-sm dark:border-slate-700">
          <CardHeader className="border-slate-100 dark:border-slate-700">
            <UiSectionTitle>Queue</UiSectionTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={columns}
              apiFunction={fetchUnassigned}
              queryParams={{ refreshKey: tableRefreshKey }}
              rowKey="_id"
              emptyMessage="No unassigned leads."
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50]}
              framed={false}
            />
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showLeadModal} onClose={closeModal} title="Edit Lead" size="lg">
        <LeadForm
          values={leadForm}
          onChange={handleFormChange}
          assignableMembers={assignableMembers}
          canManageLeadAssignment={canManageAssignment}
          error={createError}
          onSubmit={handleUpdateLead}
          onCancel={closeModal}
          loading={saving}
          pipelines={pipelinesForLeadForm.length ? pipelinesForLeadForm : pipelines}
          submitLabel="Update Lead"
        />
      </Modal>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default UnassignedLeads;

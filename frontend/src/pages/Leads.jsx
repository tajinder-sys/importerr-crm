import { useCallback, useMemo, useState, useEffect } from 'react';
import { Eye, Pencil, UserPlus, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/common/ui/Card';
import Table from '../components/common/ui/Table';
import Button from '../components/common/ui/Button';
import Modal from '../components/common/ui/Modal';
import Chip from '../components/common/ui/Chip';
import LeadForm from '../components/leads/LeadForm';
import api from '../utils/api';
import { fetchTeamAssignableUsers } from '../utils/fetchTeamAssignableUsers';
import { enrichPipelinesWithStages } from '../utils/enrichPipelinesWithStages';
import {
  formatDateIndian,
  formatIndianPhoneInput,
  formatPhone,
  getPhonePayload,
  validatePhone
} from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import { getChipVariant } from '../utils/chipConstants';
import { API_ROUTES } from '../utils/apiRoutes';
import { UiPageTitle, UiSectionTitle } from '../components/common/ui/Typography';
import { TASK_PRIORITY_LEVELS } from '../utils/constants';

const formatLeadPhoneDisplay = (phone) => {
  if (!phone) return '-';

  const digits = String(phone).replace(/\D/g, '');
  let local = digits;

  if (digits.startsWith('91') && digits.length >= 12) {
    local = digits.slice(2, 12);
  } else if (digits.length > 10) {
    local = digits.slice(-10);
  }

  if (local.length === 10) {
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }

  return formatPhone(phone);
};

const Leads = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const accountId = searchParams.get('accountId') || '';
  const accountName = searchParams.get('accountName') || '';
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [isLeadsLoading, setIsLeadsLoading] = useState(false);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [pipelinesForLeadForm, setPipelinesForLeadForm] = useState([]);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'importerr_inquiry',
    assignedTo: '',
    leadType: 'guest',
    status: 'new',
    pipelineId: '',
    stageId: '',
    message: 'Lead inquiry',
    priority: TASK_PRIORITY_LEVELS.LOW,
  });
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const canManageLeadAssignment = user?.role === 'admin' || user?.role === 'team_manager';

  const resetLeadForm = () => {
    setLeadForm({
      name: '',
      email: '',
      phone: '',
      source: 'importerr_inquiry',
      assignedTo: '',
      leadType: 'guest',
      status: 'new',
      pipelineId: selectedPipeline || '',
      stageId: '',
      message: 'Lead inquiry',
      priority: TASK_PRIORITY_LEVELS.LOW,
    });
    setCreateError('');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(API_ROUTES.pipelines.list, { params: { isActive: true, limit: 200 } });
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

  const loadMembersForPipeline = useCallback(
    async (pipelineId, ensureUser = null) => {
      if (!canManageLeadAssignment || !pipelineId) {
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
    [canManageLeadAssignment],
  );

  useEffect(() => {
    if (!showCreateLeadModal || !pipelines?.length) {
      setPipelinesForLeadForm([]);
      return undefined;
    }
    let cancelled = false;
    enrichPipelinesWithStages(pipelines).then((list) => {
      if (!cancelled) setPipelinesForLeadForm(list);
    });
    return () => {
      cancelled = true;
    };
  }, [showCreateLeadModal, pipelines]);

  useEffect(() => {
    if (!showCreateLeadModal || !canManageLeadAssignment) return undefined;
    if (!leadForm.pipelineId) {
      setAssignableMembers([]);
      return undefined;
    }
    const ensureUser = editingLead?.assignedTo || null;
    loadMembersForPipeline(leadForm.pipelineId, ensureUser);
    return undefined;
  }, [
    showCreateLeadModal,
    canManageLeadAssignment,
    leadForm.pipelineId,
    loadMembersForPipeline,
    editingLead?._id,
    editingLead?.assignedTo?._id,
  ]);

  const openCreateLeadModal = async () => {
    resetLeadForm();
    setEditingLead(null);
    setShowCreateLeadModal(true);
  };

  const openEditLeadModal = async (lead) => {
    setCreateError('');
    setEditingLead(lead);
    const assignedUserId = lead?.assignedTo?._id ? String(lead.assignedTo._id) : '';
    setLeadForm({
      name: lead?.name || '',
      email: lead?.email || '',
      phone: formatIndianPhoneInput(lead?.phone || ''),
      source: lead?.source || 'importerr_inquiry',
      assignedTo: assignedUserId,
      leadType: lead?.leadType || 'guest',
      status: lead?.status || 'new',
      pipelineId: lead?.pipelineId?._id || lead?.pipelineId || '',
      stageId: lead?.stageId?._id || lead?.stageId || '',
      message: lead?.message || 'Lead inquiry',
      priority: lead?.priority || TASK_PRIORITY_LEVELS.LOW,
    });
    setShowCreateLeadModal(true);
  };

  const handleLeadFormChange = (event) => {
    const { name, value } = event.target;
    setLeadForm((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatIndianPhoneInput(value) : value
    }));
  };

  const handleCreateLead = async (event) => {
    event.preventDefault();
    setCreateError('');
    const normalizedPhone = getPhonePayload(leadForm.phone);
    if (!normalizedPhone || !validatePhone(normalizedPhone)) {
      setCreateError('Enter a valid mobile number');
      return;
    }

    setCreatingLead(true);
    try {
      await api.post(API_ROUTES.leads.create, {
        name: leadForm.name.trim(),
        email: leadForm.email.trim(),
        phone: normalizedPhone,
        source: leadForm.source,
        leadType: leadForm.leadType,
        message: (leadForm.message || '').trim() || 'Lead inquiry',
        priority: leadForm.priority || TASK_PRIORITY_LEVELS.LOW,
        ...(canManageLeadAssignment
          ? {
              assignedTo: leadForm.assignedTo || undefined,
              pipelineId: leadForm.pipelineId || undefined,
              stageId: leadForm.stageId || undefined,
            }
          : {}),
      });
      setShowCreateLeadModal(false);
      resetLeadForm();
      setTableRefreshKey((prev) => prev + 1);
    } catch (error) {
      setCreateError(error?.message || 'Failed to create lead');
    } finally {
      setCreatingLead(false);
    }
  };

  const handleUpdateLead = async (event) => {
    event.preventDefault();
    if (!editingLead?._id) return;
    setCreateError('');
    const normalizedPhone = getPhonePayload(leadForm.phone);
    if (!normalizedPhone || !validatePhone(normalizedPhone)) {
      setCreateError('Enter a valid mobile number');
      return;
    }

    setCreatingLead(true);
    try {
      await api.put(API_ROUTES.leads.update(editingLead._id), {
        name: leadForm.name.trim(),
        email: leadForm.email.trim(),
        phone: normalizedPhone,
        source: leadForm.source,
        leadType: leadForm.leadType,
        status: leadForm.status,
        message: (leadForm.message || '').trim(),
        priority: leadForm.priority || TASK_PRIORITY_LEVELS.LOW,
        ...(canManageLeadAssignment
          ? {
              assignedTo: leadForm.assignedTo || null,
              pipelineId: leadForm.pipelineId || null,
              stageId: leadForm.stageId || null,
            }
          : {}),
      });
      setShowCreateLeadModal(false);
      setEditingLead(null);
      resetLeadForm();
      setTableRefreshKey((prev) => prev + 1);
    } catch (error) {
      setCreateError(error?.message || 'Failed to update lead');
    } finally {
      setCreatingLead(false);
    }
  };

  const fetchLeads = useCallback(async ({ page, limit, sortKey, sortDirection, search, status, source, pipelineId }) => {
    setIsLeadsLoading(true);
    try {
      const resolvedSortBy = sortKey || 'createdAt';
      const resolvedSortOrder = sortKey ? (sortDirection || 'desc') : 'desc';
      const response = await api.get(API_ROUTES.leads.list, {
        params: {
          page,
          limit,
          sortBy: resolvedSortBy,
          sortOrder: resolvedSortOrder,
          ...(search ? { search } : {}),
          ...(status && status !== 'all' ? { status } : {}),
          ...(source && source !== 'all' ? { source } : {}),
          ...(pipelineId ? { pipelineId } : {}),
          ...(accountId ? { accountId } : {})
        }
      });

      return {
        data: response?.data?.leads || [],
        total: response?.data?.pagination?.total || 0
      };
    } catch {
      return { data: [], total: 0 };
    } finally {
      setIsLeadsLoading(false);
    }
  }, [accountId]);

  // Set first pipeline as default when component loads
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelines[0]._id);
    }
  }, [pipelines]);

  // Handle pipeline change to fetch stages for that pipeline
  useEffect(() => {
    if (selectedPipeline) {
      const selectedPipelineData = pipelines.find(p => p._id === selectedPipeline);
      if (selectedPipelineData && !selectedPipelineData.stages) {
        // Fetch stages for the selected pipeline
        fetchStagesForPipeline(selectedPipeline);
      }
    }
  }, [selectedPipeline]);

  const fetchStagesForPipeline = async (pipelineId) => {
    try {
      const response = await api.get(API_ROUTES.stages.list, {
        params: { pipelineId }
      });
      if (response.success) {
        // Update the pipeline with stages
        setPipelines(prev => prev.map(p => 
          p._id === pipelineId 
            ? { ...p, stages: response.data?.stages || [] }
            : p
        ));
      }
    } catch (error) {
      console.error('Error fetching stages for pipeline:', error);
    }
  };

  const tableQueryParams = useMemo(
    () => ({
      refreshKey: tableRefreshKey,
      pipelineId: selectedPipeline,
      accountId
    }),
    [tableRefreshKey, selectedPipeline, accountId]
  );

  const columns = [
    { key: 'name', sortKey: 'name', sortable: true, header: 'Lead Name' ,
      render: (lead) => <span className="font-medium text-gray-900">{lead.name}</span>
    },
    {
      key: 'phone',
      sortKey: 'phone',
      sortable: true,
      header: 'Phone',
      render: (lead) => formatLeadPhoneDisplay(lead.phone)
    },
    { key: 'email', sortKey: 'email', sortable: true, header: 'Email' },
    {
      key: 'assignedTo',
      sortKey: 'assignedTo',
      sortable: true,
      header: 'Assigned To',
      render: (lead) => lead?.assignedTo?.name || '-'
    },
    {
      key: 'pipelineId',
      sortKey: 'pipelineId',
      sortable: true,
      header: 'Pipeline',
      render: (lead) => lead?.pipelineId?.name || '-'
    },
    {
      key: 'stageId',
      sortKey: 'stageId',
      sortable: true,
      header: 'Stage',
      render: (lead) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: lead?.stageId?.color || '#6b7280' }}
          />
          <span className="text-sm font-medium">{lead?.stageId?.name || '-'}</span>
        </div>
      )
    },
    {
      key: 'source',
      sortKey: 'source',
      sortable: true,
      header: 'Source',
      render: (lead) => <Chip label={lead.source} variant={getChipVariant('SOURCE', lead.source)} />
    },
    {
      key: 'status',
      sortKey: 'status',
      sortable: true,
      header: 'Status',
      render: (lead) => <Chip label={lead.status} variant={getChipVariant('STATUS', lead.status)} />
    },
    {
      key: 'createdAt',
      sortKey: 'createdAt',
      sortable: true,
      header: 'Created At',
      render: (lead) => formatDateIndian(lead.createdAt)
    },
    {
      key: 'action',
      header: 'Action',
      render: (lead) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            iconOnly
            startIcon={<Eye className="h-4 w-4" />}
            onClick={() => window.open(`/leads/${lead._id}`, '_blank', 'noopener,noreferrer')}
            title="View lead details"
            aria-label="View lead details"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            iconOnly
            startIcon={<Pencil className="h-4 w-4" />}
            onClick={() => openEditLeadModal(lead)}
            title="Edit lead"
            aria-label="Edit lead"
          />
        </div>
      )
    }
  ];

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UiPageTitle>Lead Management</UiPageTitle>
            <p className="mt-1 text-sm text-gray-500">
              {accountName ? (
                <span className="inline-flex items-center gap-1">
                  Showing leads from <span className="font-medium text-gray-700">{accountName}</span>
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : 'Track and manage all incoming leads.'}
            </p>
          </div>
          <Button onClick={openCreateLeadModal} startIcon={<UserPlus className="h-4 w-4" />}>
            Create Lead
          </Button>
        </div>
        
        {/* Pipeline Tabs */}
        {pipelines.length > 0 && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {pipelines.map((pipeline) => (
                  <button
                    key={pipeline._id}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedPipeline === pipeline._id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPipeline(pipeline._id)}
                  >
                    {pipeline.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
        {/* <LeadFilters
          filters={draftFilters}
          onFilterChange={setFilter}
          onSearchChange={setSearchDraft}
          onSearchEnter={applySearchFilter}
          onReset={resetFilters}
          disabled={isLeadsLoading}
        /> */}

        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100">
            <UiSectionTitle>Leads</UiSectionTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={columns}
              apiFunction={fetchLeads}
              queryParams={tableQueryParams}
              rowKey="_id"
              emptyMessage="No leads found."
              defaultPageSize={10}
              pageSizeOptions={[10, 20, 50]}
              framed={false}
            />
          </CardContent>
        </Card>

        <Modal
          isOpen={showCreateLeadModal}
          onClose={() => {
            setShowCreateLeadModal(false);
            setEditingLead(null);
            resetLeadForm();
          }}
          title={editingLead ? 'Edit Lead' : 'Create Lead'}
          size="lg"
        >
          <LeadForm
            values={leadForm}
            onChange={handleLeadFormChange}
            assignableMembers={assignableMembers}
            canManageLeadAssignment={canManageLeadAssignment}
            error={createError}
            onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
            onCancel={() => {
              setShowCreateLeadModal(false);
              setEditingLead(null);
              resetLeadForm();
            }}
            loading={creatingLead}
            submitLabel={editingLead ? 'Update Lead' : 'Create Lead'}
            pipelines={pipelinesForLeadForm.length ? pipelinesForLeadForm : pipelines}
          />
        </Modal>
      </div>
    </div>
  );
};

export default Leads;

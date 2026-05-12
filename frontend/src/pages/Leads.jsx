import { useCallback, useMemo, useState } from 'react';
import { Eye, Pencil, UserPlus, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Chip from '../components/common/Chip';
import LeadForm from '../components/leads/LeadForm';
import api from '../utils/api';
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
import LeadFilters from '../components/leads/LeadFilters';
import { useEffect } from 'react';

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

  const [draftFilters, setDraftFilters] = useState({
    search: '',
    status: 'all',
    source: 'all'
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'all',
    source: 'all'
  });
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'importerr_inquiry',
    assignedTo: '',
    leadType: 'guest',
    status: 'new'
  });
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const navigate = useNavigate();
  const canManageLeadAssignment = user?.role === 'admin' || user?.role === 'team_manager';

  const setFilter = (name, value) => {
    setDraftFilters((prev) => {
      const next = { ...prev, [name]: value };
      setAppliedFilters({
        search: next.search.trim(),
        status: next.status,
        source: next.source
      });
      return next;
    });
  };

  const setSearchDraft = (value) => {
    setDraftFilters((prev) => ({ ...prev, search: value }));
  };

  const applySearchFilter = () => {
    setAppliedFilters((prev) => ({
      ...prev,
      search: draftFilters.search.trim()
    }));
  };

  const resetFilters = () => {
    const resetState = { search: '', status: 'all', source: 'all' };
    setDraftFilters(resetState);
    setAppliedFilters(resetState);
  };

  const resetLeadForm = () => {
    setLeadForm({
      name: '',
      email: '',
      phone: '',
      source: 'importerr_inquiry',
      assignedTo: '',
      leadType: 'guest',
      status: 'new'
    });
    setCreateError('');
  };

  const loadAssignableMembers = useCallback(async () => {
    if (!canManageLeadAssignment) return;
    const response = await api.get(API_ROUTES.users.list, {
      params: { role: 'team_member', page: 1, limit: 200 }
    });
    setAssignableMembers(response?.data?.users || []);
  }, [canManageLeadAssignment]);

  const fetchPipelines = useCallback(async () => {
    try {
      const response = await api.get(API_ROUTES.pipelines.list);
      if (response.success) {
        setPipelines(response.data?.pipelines || []);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  }, []);

  const openCreateLeadModal = async () => {
    resetLeadForm();
    setEditingLead(null);
    setShowCreateLeadModal(true);
    if (canManageLeadAssignment && assignableMembers.length === 0) {
      try {
        await loadAssignableMembers();
      } catch (error) {
        setCreateError(error?.message || 'Failed to load users');
      }
    }
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
      status: lead?.status || 'new'
    });
    if (assignedUserId) {
      setAssignableMembers((prev) => {
        const exists = prev.some((member) => String(member?._id) === assignedUserId);
        if (exists) return prev;
        return [
          ...prev,
          {
            _id: assignedUserId,
            name: lead?.assignedTo?.name || 'Assigned User',
            email: lead?.assignedTo?.email || ''
          }
        ];
      });
    }
    setShowCreateLeadModal(true);
    if (canManageLeadAssignment && assignableMembers.length === 0) {
      try {
        await loadAssignableMembers();
      } catch (error) {
        setCreateError(error?.message || 'Failed to load users');
      }
    }
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
        ...(canManageLeadAssignment && leadForm.assignedTo ? { assignedTo: leadForm.assignedTo } : {})
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
        ...(canManageLeadAssignment ? { assignedTo: leadForm.assignedTo || null } : {})
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
      search: appliedFilters.search,
      status: appliedFilters.status,
      source: appliedFilters.source,
      refreshKey: tableRefreshKey,
      pipelineId: selectedPipeline,
      accountId
    }),
    [appliedFilters, tableRefreshKey, selectedPipeline, accountId]
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
          />
        </Modal>
      </div>
    </div>
  );
};

export default Leads;

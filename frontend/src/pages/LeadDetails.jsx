import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/ui/Button';
import Chip from '../components/common/ui/Chip';
import Snackbar from '../components/common/ui/Snackbar';
import Modal from '../components/common/ui/Modal';
import Skeleton from '../components/common/ui/Skeleton';
import LeadForm from '../components/leads/LeadForm';
import api from '../utils/api';
import { formatIndianPhoneInput, getPhonePayload, validatePhone } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';
import LeadDetailsOverviewCard from '../components/lead-details/LeadDetailsOverviewCard';
import CommunicationTab from '../components/lead-details/CommunicationTab';
import ActivityTab from '../components/lead-details/ActivityTab';
import { API_ROUTES } from '../utils/apiRoutes';
import { enrichPipelinesWithStages } from '../utils/enrichPipelinesWithStages';
import { fetchTeamAssignableUsers } from '../utils/fetchTeamAssignableUsers';
import { getChipVariant } from '../utils/chipConstants';
import { TASK_PRIORITY_LEVELS } from '../utils/constants';
import QuotesTab from '../components/lead-details/Quote/index';
import LeadNotes from '../components/common/LeadNotes';
import LeadTasksTab from '../components/lead-details/LeadTasksTab';
import PageHeader from '../components/common/ui/PageHeader';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'lead_details', label: 'Details' },
  { key: 'notes', label: 'Notes' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'communication', label: 'Communication' },
  { key: 'activity', label: 'Activity', adminOnly: true },
];

const DEFAULT_LEAD_FORM = {
  name: '',
  email: '',
  phone: '',
  source: 'importerr_inquiry',
  assignedTo: '',
  leadType: 'guest',
  status: 'new',
  pipelineId: '',
  stageId: '',
  message: '',
  priority: 'low',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const LeadDetailsSkeleton = () => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-3 pt-3">
        <div className="flex flex-wrap gap-2">
          {[20, 20, 28, 20].map((w, i) => (
            <Skeleton key={i} className={`h-9 w-${w} rounded-t-xl`} />
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ['16', '28'], ['16', '36'], ['16', '28'], ['20', '32'],
            ['14', '24'], ['14', '16'], ['20', '24'],
          ].map(([lw, vw], i) => (
            <div key={i} className="space-y-2">
              <Skeleton className={`h-3 w-${lw}`} />
              <Skeleton className={`h-4 w-${vw}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);


// ─── Main Component ───────────────────────────────────────────────────────────

const LeadDetails = () => {
  const { user } = useAuth();
  const { id: leadId } = useParams();
  const navigate = useNavigate();

  // ── Permissions ──
  const canViewHistory = ['admin', 'team_manager'].includes(user?.role);
  const canReplyCommunication = ['admin', 'team_manager', 'team_member'].includes(user?.role);
  const canManageLeadAssignment = ['admin', 'team_manager'].includes(user?.role);

  // ── Core data ──
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState(null);
  const [leadActivities, setLeadActivities] = useState([]);
  const [leadCommunications, setLeadCommunications] = useState([]);

  // ── Product / pricing ──
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [finalPrice, setFinalPrice] = useState(null);

  const [initialFinalPrice, setInitialFinalPrice] = useState(null);
  const [isFetchingFinalPrice, setIsFetchingFinalPrice] = useState(false);
  const [pricingFormulaDraft, setPricingFormulaDraft] = useState({});
  const [initialBreakdown, setInitialBreakdown] = useState(null);
  const [pricingVariantsDraft, setPricingVariantsDraft] = useState([]);

  // ── Communication ──
  const [replyMessage, setReplyMessage] = useState('');
  const [replySource, setReplySource] = useState('whatsapp');
  const [sendingCommunication, setSendingCommunication] = useState(false);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState('lead_details');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  // ── Edit lead modal ──
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState(DEFAULT_LEAD_FORM);
  const [updatingLead, setUpdatingLead] = useState(false);
  const [updateLeadError, setUpdateLeadError] = useState('');
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [pipelinesForLeadForm, setPipelinesForLeadForm] = useState([]);
  // ─── Snackbar helpers ──────────────────────────────────────────────────────
  const showSuccess = useCallback((msg) => setSnackbar({ open: true, message: msg, type: 'success' }), []);
  const showError = useCallback((msg) => setSnackbar({ open: true, message: msg, type: 'error' }), []);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const sortedLeadActivities = useMemo(
    () => [...leadActivities].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)),
    [leadActivities]
  );

  const leadSource = lead?.source ?? null;

  const communicationSourceOptions = useMemo(() => {
    if (!leadSource || leadSource === 'importerr_inquiry') return [{ value: 'whatsapp' }, { value: 'email' }];
    return [{ value: leadSource }];
  }, [leadSource]);

  const effectiveReplySource = useMemo(
    () => leadSource === 'importerr_inquiry' ? replySource : communicationSourceOptions[0]?.value || leadSource || 'whatsapp',
    [leadSource, replySource, communicationSourceOptions]
  );

  const visibleTabs = useMemo(
    () => TABS.filter((t) => (t.adminOnly ? canViewHistory : true)),
    [canViewHistory]
  );

  // ─── Fetch helpers ────────────────────────────────────────────────────────

  const fetchLeadDetail = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { data } = await api.get(API_ROUTES.leads.byId(leadId));
      setLead(data?.lead || null);
      setLeadActivities(data?.activities || []);
      setLeadCommunications(data?.communications || []);
    } catch (err) {
      showError(err?.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }, [leadId, showError]);

  const fetchVariantPriceDetails = useCallback(async (productRef) => {
    const ref = String(productRef || '').trim();
    
    try {
      const { data } = await api.get(API_ROUTES.importerr.productVariantPriceDetails(ref));
   
      setSelectedProduct(data?.product || null);
    } catch {
      setSelectedProduct(null);
    } finally {
      console.log('Product price details fetched');
    }
  }, []);


  const loadAssignableForPipeline = useCallback(
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
    if (!canManageLeadAssignment) {
      startTransition(() => setPipelinesForLeadForm([]));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(API_ROUTES.pipelines.list, { params: { isActive: true, limit: 200 } });
        const list = res?.data?.pipelines || res?.data || [];
        const enriched = await enrichPipelinesWithStages(list);
        if (!cancelled) setPipelinesForLeadForm(enriched);
      } catch {
        if (!cancelled) setPipelinesForLeadForm([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageLeadAssignment]);

  useEffect(() => {
    if (!showEditLeadModal || !canManageLeadAssignment) return undefined;
    if (!leadForm.pipelineId) {
      startTransition(() => setAssignableMembers([]));
      return undefined;
    }
    const ensureUser = lead?.assignedTo || null;
    const run = async () => { await loadAssignableForPipeline(leadForm.pipelineId, ensureUser); };
    run();
    return undefined;
  }, [
    showEditLeadModal,
    canManageLeadAssignment,
    leadForm.pipelineId,
    loadAssignableForPipeline,
    lead,
    lead?._id,
    lead?.assignedTo?._id,
  ]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => {
    const t = setTimeout(fetchLeadDetail, 0);
    return () => clearTimeout(t);
  }, [leadId, fetchLeadDetail]);

  // Auto-fetch product data when lead loads
  useEffect(() => {
    const productRef = String(lead?.productId || lead?.productSku || '').trim();
    const run = async () => { await fetchVariantPriceDetails(productRef); };
    run();
  }, [lead?.productId, lead?.productSku, lead?.variants, fetchVariantPriceDetails]);


  const sendCommunication = useCallback(async () => {
    if (!leadId || !replyMessage.trim()) {
      showError('Please enter a message to send');
      return;
    }
    setSendingCommunication(true);
    try {
      await api.post(API_ROUTES.leads.communications(leadId), {
        message: replyMessage.trim(),
        source: effectiveReplySource,
      });
      setReplyMessage('');
      showSuccess('Communication sent successfully');
      await fetchLeadDetail();
    } catch (err) {
      showError(err?.message || 'Failed to send communication');
    } finally {
      setSendingCommunication(false);
    }
  }, [leadId, replyMessage, effectiveReplySource, showError, showSuccess, fetchLeadDetail]);

  const handleLeadFormChange = useCallback(({ target: { name, value } }) => {
    setLeadForm((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatIndianPhoneInput(value) : value,
    }));
  }, []);

  const openEditLeadModal = useCallback(() => {
    if (!lead) return;
    setUpdateLeadError('');
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
      message: lead?.message || '',
      priority: lead?.priority || TASK_PRIORITY_LEVELS.LOW,
    });

    setShowEditLeadModal(true);
  }, [lead]);

  const closeEditLeadModal = useCallback(() => {
    setShowEditLeadModal(false);
    setUpdateLeadError('');
  }, []);

  const handleUpdateLead = useCallback(async (e) => {
    e.preventDefault();
    if (!lead?._id) return;

    const normalizedPhone = getPhonePayload(leadForm.phone);
    if (!normalizedPhone || !validatePhone(normalizedPhone)) {
      setUpdateLeadError('Enter a valid mobile number');
      return;
    }

    setUpdatingLead(true);
    setUpdateLeadError('');
    try {
      await api.put(API_ROUTES.leads.update(lead._id), {
        name: leadForm.name.trim(),
        email: leadForm.email.trim(),
        phone: normalizedPhone,
        source: leadForm.source,
        leadType: leadForm.leadType,
        status: leadForm.status,
        message: (leadForm.message ?? '').trim(),
        priority: leadForm.priority || TASK_PRIORITY_LEVELS.LOW,
        ...(canManageLeadAssignment
          ? {
              assignedTo: leadForm.assignedTo || null,
              pipelineId: leadForm.pipelineId || null,
              stageId: leadForm.stageId || null,
            }
          : {}),
      });
      closeEditLeadModal();
      showSuccess('Lead updated successfully');
      await fetchLeadDetail();
    } catch (err) {
      setUpdateLeadError(err?.message || 'Failed to update lead');
    } finally {
      setUpdatingLead(false);
    }
  }, [lead, leadForm, canManageLeadAssignment, closeEditLeadModal, showSuccess, fetchLeadDetail]);

  const handleAttachManualProduct = useCallback(
    async (productPayload, options = {}) => {
      if (!lead?._id) {
        throw new Error('No lead loaded');
      }
      const normalizedPhone = getPhonePayload(formatIndianPhoneInput(lead.phone || ''));
      if (!normalizedPhone || !validatePhone(normalizedPhone)) {
        throw new Error('Add a valid 10-digit mobile on the lead before attaching a product.');
      }
      await api.put(API_ROUTES.leads.update(lead._id), {
        name: String(lead.name || '').trim(),
        email: String(lead.email || '').trim(),
        phone: normalizedPhone,
        source: lead.source,
        leadType: lead.leadType || 'guest',
        status: lead.status || 'new',
        ...(canManageLeadAssignment
          ? { assignedTo: lead.assignedTo?._id || lead.assignedTo || null }
          : {}),
        ...productPayload,
      });
      setFinalPrice(null);
      setInitialFinalPrice(null);
      setInitialBreakdown(null);
      setPricingVariantsDraft([]);
      setPricingFormulaDraft({});
      setSelectedProduct(null);
      await fetchLeadDetail();
      showSuccess(options?.isEdit ? 'Product updated on lead' : 'Product added to lead');
    },
    [lead, canManageLeadAssignment, fetchLeadDetail, showSuccess]
  );

  // ─── Shared pricing props (avoids repeating the same object twice) ──────

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 min-h-screen dark:bg-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <PageHeader
          title="Lead Details"
          description="View lead profile, product details, communication, and activity."
          meta={
            lead ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {lead.source && <Chip label={lead.source} variant={getChipVariant('SOURCE', lead.source)} />}
                {lead.status && <Chip label={lead.status} variant={getChipVariant('STATUS', lead.status)} />}
              </div>
            ) : null
          }
          actions={(
            <>
              <Button variant="outline" startIcon={<Pencil className="h-4 w-4" />} onClick={openEditLeadModal} disabled={!lead}>
                Edit Lead
              </Button>
              <Button variant="outline" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/leads')}>
                Back to Leads
              </Button>
            </>
          )}
        />

        {loading && <LeadDetailsSkeleton />}

        {!loading && lead && (
          <div className="rounded-2xl !mt-8">
            {/* Tab bar */}
            <div className="bg-gray-50/80 dark:bg-slate-800/80">
              <div className="flex flex-wrap items-end gap-2">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? 'z-10 -mb-px bg-white text-primary-700 dark:bg-slate-800 dark:text-primary-400'
                        : 'border-transparent bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab panels */}
            <div className="min-h-[70vh]">
              {activeTab === 'lead_details' && (
                <LeadDetailsOverviewCard
                  lead={lead}
                  selectedProduct={selectedProduct}
                  setFinalPrice={setFinalPrice}
                  finalPrice={finalPrice}
                  initialFinalPrice = {initialFinalPrice}
                  isFetchingFinalPrice = {isFetchingFinalPrice}
                  pricingFormulaDraft = {pricingFormulaDraft}
                  initialBreakdown = {initialBreakdown}
                  pricingVariantsDraft = {pricingVariantsDraft}
                  setInitialFinalPrice = {setInitialFinalPrice}
                  setIsFetchingFinalPrice = {setIsFetchingFinalPrice}
                  setPricingFormulaDraft = {setPricingFormulaDraft}
                  setInitialBreakdown = {setInitialBreakdown}
                  setPricingVariantsDraft = {setPricingVariantsDraft}
                  onAttachManualProduct={handleAttachManualProduct}
                />
              )}

              {activeTab === 'communication' && (
                <CommunicationTab
                  lead={lead}
                  leadCommunications={leadCommunications}
                  canReplyCommunication={canReplyCommunication}
                  replySource={replySource}
                  setReplySource={setReplySource}
                  communicationSourceOptions={communicationSourceOptions}
                  effectiveReplySource={effectiveReplySource}
                  replyMessage={replyMessage}
                  setReplyMessage={setReplyMessage}
                  onSendCommunication={sendCommunication}
                  sendingCommunication={sendingCommunication}
                />
              )}

              {activeTab === 'notes' && (
                <LeadNotes 
                  leadId={leadId}
                  showError={showError}
                  showSuccess={showSuccess}
                />
              )}

              {activeTab === 'quotes' && (
                <QuotesTab lead={lead} showError={showError}/>
              )}

              {activeTab === 'tasks' && (
                <LeadTasksTab
                  leadId={lead._id}
                  leadName={lead.name || lead.email || 'Lead'}
                  showError={showError}
                  showSuccess={showSuccess}
                />
              )}

              {activeTab === 'activity' && (
                <ActivityTab canViewHistory={canViewHistory} sortedLeadActivities={sortedLeadActivities} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />

      {/* Edit Lead Modal */}
      <Modal isOpen={showEditLeadModal} onClose={closeEditLeadModal} title="Edit Lead" size="lg">
        <LeadForm
          values={leadForm}
          onChange={handleLeadFormChange}
          assignableMembers={assignableMembers}
          canManageLeadAssignment={canManageLeadAssignment}
          error={updateLeadError}
          onSubmit={handleUpdateLead}
          onCancel={closeEditLeadModal}
          loading={updatingLead}
          submitLabel="Update Lead"
          pipelines={pipelinesForLeadForm}
        />
      </Modal>
    </div>
  );
};

export default LeadDetails;

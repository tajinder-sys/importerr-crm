import { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import {
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  Package,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/ui/Button';
import Chip from '../components/common/ui/Chip';
import Snackbar from '../components/common/ui/Snackbar';
import Modal from '../components/common/ui/Modal';
import Skeleton from '../components/common/ui/Skeleton';
import LeadForm from '../components/leads/LeadForm';
import api from '../utils/api';
import { formatIndianPhoneInput, getPhonePayload, validatePhone, cn } from '../utils/helpers';
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
import LeadStageSlaBar from '../components/leads/LeadStageSlaBar';
import LeadMarkCompletedPanel from '../components/leads/LeadMarkCompletedPanel';
import LeadStageTimeline from '../components/lead-details/LeadStageTimeline';
import OrderDetailsTab from '../components/lead-details/OrderDetailsTab';
import RelatedLeadsPanel from '../components/lead-details/RelatedLeadsPanel';
import LeadQuickFacts from '../components/lead-details/LeadQuickFacts';
import { leadHasOrder, leadOrderDisplayId, leadOrderFetchId } from '../utils/leadOrderFields';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_TABS = [
  { key: 'lead_details',  label: 'Details' },
  { key: 'related',       label: 'Related' },
  { key: 'notes',         label: 'Notes' },
  { key: 'quotes',        label: 'Quotes' },
  { key: 'tasks',         label: 'Tasks' },
  { key: 'communication', label: 'Communication' },
  { key: 'activity',      label: 'Activity', adminOnly: true },
];

const DEFAULT_LEAD_FORM = {
  name: '', email: '', phone: '', source: 'importerr_inquiry',
  assignedTo: '', leadType: 'guest', status: 'new',
  pipelineId: '', stageId: '', message: '', priority: 'low',
};

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low:    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
};

function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.low)}>
      {priority} priority
    </span>
  );
}

// ─── Lead hero header ─────────────────────────────────────────────────────────

function LeadHero({ lead, onEdit, onBack }) {
  const initials = (lead?.name || lead?.email || '?')
    .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800/90">
      <div className="flex flex-wrap items-start justify-between gap-4">

        {/* Left: avatar + identity */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-[15px] font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100 truncate">
              {lead.name || '—'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {lead.phone}
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {lead.email}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {lead.source && <Chip label={lead.source} variant={getChipVariant('SOURCE', lead.source)} />}
              {lead.status && <Chip label={lead.status} variant={getChipVariant('STATUS', lead.status)} />}
              <PriorityBadge priority={lead.priority} />
              {leadHasOrder(lead) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Package className="h-2.5 w-2.5" />
                  Order #{leadOrderDisplayId(lead)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" startIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
            Edit lead
          </Button>
          <Button size="sm" variant="outline" startIcon={<ArrowLeft className="h-3.5 w-3.5" />} onClick={onBack}>
            {lead?.isCompleted ? 'Back to completed' : 'Back'}
          </Button>
        </div>
      </div>

      <LeadQuickFacts lead={lead} variant="compact" />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LeadDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap items-end gap-1 border-b border-slate-200 bg-slate-50/80 px-1 pt-1 dark:border-slate-700 dark:bg-slate-800/80">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3.5 py-2 text-[12px] font-medium transition-colors',
            active === tab.key
              ? 'border-slate-200 bg-white text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400'
              : 'border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
          )}
        >
          {tab.icon && <tab.icon className="h-3 w-3" />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LeadDetails = () => {
  const { user } = useAuth();
  const { id: leadId } = useParams();
  const navigate = useNavigate();

  const canViewHistory       = ['admin', 'team_manager'].includes(user?.role);
  const canReplyCommunication = ['admin', 'team_manager', 'team_member'].includes(user?.role);
  const canManageLeadAssignment = ['admin', 'team_manager'].includes(user?.role);

  const [loading, setLoading]                   = useState(false);
  const [lead, setLead]                         = useState(null);
  const [completion, setCompletion]             = useState(null);
  const [stageHistory, setStageHistory]         = useState([]);
  const [leadActivities, setLeadActivities]     = useState([]);
  const [leadCommunications, setLeadCommunications] = useState([]);

  const [selectedProduct, setSelectedProduct]   = useState(null);
  const [finalPrice, setFinalPrice]             = useState(null);
  const [initialFinalPrice, setInitialFinalPrice] = useState(null);
  const [isFetchingFinalPrice, setIsFetchingFinalPrice] = useState(false);
  const [pricingFormulaDraft, setPricingFormulaDraft]   = useState({});
  const [initialBreakdown, setInitialBreakdown]         = useState(null);
  const [pricingVariantsDraft, setPricingVariantsDraft] = useState([]);

  const [replyMessage, setReplyMessage]         = useState('');
  const [replySource, setReplySource]           = useState('whatsapp');
  const [sendingCommunication, setSendingCommunication] = useState(false);

  const [activeTab, setActiveTab]               = useState('lead_details');
  const [relatedLeads, setRelatedLeads]         = useState([]);
  const [relatedMatchFields, setRelatedMatchFields] = useState([]);
  const [relatedLoading, setRelatedLoading]     = useState(false);
  const [snackbar, setSnackbar]                 = useState({ open: false, message: '', type: 'success' });

  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [leadForm, setLeadForm]                 = useState(DEFAULT_LEAD_FORM);
  const [updatingLead, setUpdatingLead]         = useState(false);
  const [updateLeadError, setUpdateLeadError]   = useState('');
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [pipelinesForLeadForm, setPipelinesForLeadForm] = useState([]);

  const showSuccess = useCallback((msg) => setSnackbar({ open: true, message: msg, type: 'success' }), []);
  const showError   = useCallback((msg) => setSnackbar({ open: true, message: msg, type: 'error' }),   []);

  const sortedLeadActivities = useMemo(
    () => [...leadActivities].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)),
    [leadActivities],
  );

  const leadSource = lead?.source ?? null;
  const communicationSourceOptions = useMemo(() => {
    if (!leadSource || leadSource === 'importerr_inquiry') return [{ value: 'whatsapp' }, { value: 'email' }];
    return [{ value: leadSource }];
  }, [leadSource]);

  const effectiveReplySource = useMemo(
    () => leadSource === 'importerr_inquiry' ? replySource : communicationSourceOptions[0]?.value || leadSource || 'whatsapp',
    [leadSource, replySource, communicationSourceOptions],
  );

  // Build tab list — inject Order tab when lead has an order linked
  const visibleTabs = useMemo(() => {
    const base = BASE_TABS.filter((t) => (t.adminOnly ? canViewHistory : true)).map((t) => {
      if (t.key === 'related' && relatedLeads.length > 0) {
        return { ...t, label: `Related (${relatedLeads.length})` };
      }
      return t;
    });
    if (leadHasOrder(lead)) {
      const commIdx = base.findIndex((t) => t.key === 'communication');
      const orderTab = { key: 'order', label: 'Order', icon: Package };
      base.splice(commIdx === -1 ? base.length : commIdx, 0, orderTab);
    }
    return base;
  }, [canViewHistory, lead, relatedLeads.length]);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchRelatedLeads = useCallback(async () => {
    if (!leadId) return;
    setRelatedLoading(true);
    try {
      const { data } = await api.get(API_ROUTES.leads.related(leadId));
      setRelatedLeads(data?.related || []);
      setRelatedMatchFields(data?.matchFields || []);
    } catch {
      setRelatedLeads([]);
      setRelatedMatchFields([]);
    } finally {
      setRelatedLoading(false);
    }
  }, [leadId]);

  const fetchLeadDetail = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const { data } = await api.get(API_ROUTES.leads.byId(leadId));
      setLead(data?.lead || null);
      setCompletion(data?.completion || null);
      setStageHistory(data?.stageHistory || []);
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
    if (!ref) return;
    try {
      const { data } = await api.get(API_ROUTES.importerr.productVariantPriceDetails(ref));
      setSelectedProduct(data?.product || null);
    } catch {
      setSelectedProduct(null);
    }
  }, []);

  const loadAssignableForPipeline = useCallback(async (pipelineId, ensureUser = null) => {
    if (!canManageLeadAssignment || !pipelineId) { setAssignableMembers([]); return; }
    try {
      const list = await fetchTeamAssignableUsers({ pipelineId: String(pipelineId) });
      const base = (list || []).map((u) => ({ _id: u._id, name: u.name || '', email: '' }));
      if (ensureUser?._id && !base.some((m) => String(m._id) === String(ensureUser._id))) {
        base.push({ _id: ensureUser._id, name: ensureUser.name || '', email: ensureUser.email || '' });
      }
      setAssignableMembers(base);
    } catch { setAssignableMembers([]); }
  }, [canManageLeadAssignment]);

  useEffect(() => {
    if (!canManageLeadAssignment) { startTransition(() => setPipelinesForLeadForm([])); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(API_ROUTES.pipelines.list, { params: { isActive: true, limit: 200 } });
        const list = res?.data?.pipelines || res?.data || [];
        const enriched = await enrichPipelinesWithStages(list);
        if (!cancelled) setPipelinesForLeadForm(enriched);
      } catch { if (!cancelled) setPipelinesForLeadForm([]); }
    })();
    return () => { cancelled = true; };
  }, [canManageLeadAssignment]);

  useEffect(() => {
    if (!showEditLeadModal || !canManageLeadAssignment || !leadForm.pipelineId) {
      startTransition(() => setAssignableMembers([]));
      return;
    }
    loadAssignableForPipeline(leadForm.pipelineId, lead?.assignedTo || null);
  }, [showEditLeadModal, canManageLeadAssignment, leadForm.pipelineId, loadAssignableForPipeline, lead]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchLeadDetail();
      fetchRelatedLeads();
    }, 0);
    return () => clearTimeout(t);
  }, [leadId, fetchLeadDetail, fetchRelatedLeads]);

  useEffect(() => {
    const ref = String(lead?.productId || lead?.productSku || '').trim();
    if (ref) fetchVariantPriceDetails(ref);
  }, [lead?.productId, lead?.productSku, fetchVariantPriceDetails]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const sendCommunication = useCallback(async () => {
    if (!leadId || !replyMessage.trim()) { showError('Please enter a message to send'); return; }
    setSendingCommunication(true);
    try {
      await api.post(API_ROUTES.leads.communications(leadId), { message: replyMessage.trim(), source: effectiveReplySource });
      setReplyMessage('');
      showSuccess('Communication sent successfully');
      await fetchLeadDetail();
    } catch (err) { showError(err?.message || 'Failed to send communication'); }
    finally { setSendingCommunication(false); }
  }, [leadId, replyMessage, effectiveReplySource, showError, showSuccess, fetchLeadDetail]);

  const handleLeadFormChange = useCallback(({ target: { name, value } }) => {
    setLeadForm((prev) => ({ ...prev, [name]: name === 'phone' ? formatIndianPhoneInput(value) : value }));
  }, []);

  const openEditLeadModal = useCallback(() => {
    if (!lead) return;
    setUpdateLeadError('');
    setLeadForm({
      name: lead?.name || '', email: lead?.email || '',
      phone: formatIndianPhoneInput(lead?.phone || ''),
      source: lead?.source || 'importerr_inquiry',
      assignedTo: lead?.assignedTo?._id ? String(lead.assignedTo._id) : '',
      leadType: lead?.leadType || 'guest', status: lead?.status || 'new',
      pipelineId: lead?.pipelineId?._id || lead?.pipelineId || '',
      stageId: lead?.stageId?._id || lead?.stageId || '',
      message: lead?.message || '', priority: lead?.priority || TASK_PRIORITY_LEVELS.LOW,
    });
    setShowEditLeadModal(true);
  }, [lead]);

  const closeEditLeadModal = useCallback(() => { setShowEditLeadModal(false); setUpdateLeadError(''); }, []);

  const handleUpdateLead = useCallback(async (e) => {
    e.preventDefault();
    if (!lead?._id) return;
    const normalizedPhone = getPhonePayload(leadForm.phone);
    if (!normalizedPhone || !validatePhone(normalizedPhone)) { setUpdateLeadError('Enter a valid mobile number'); return; }
    setUpdatingLead(true); setUpdateLeadError('');
    try {
      await api.put(API_ROUTES.leads.update(lead._id), {
        name: leadForm.name.trim(), email: leadForm.email.trim(), phone: normalizedPhone,
        source: leadForm.source, leadType: leadForm.leadType, status: leadForm.status,
        message: (leadForm.message ?? '').trim(), priority: leadForm.priority || TASK_PRIORITY_LEVELS.LOW,
        ...(canManageLeadAssignment ? { assignedTo: leadForm.assignedTo || null, pipelineId: leadForm.pipelineId || null, stageId: leadForm.stageId || null } : {}),
      });
      closeEditLeadModal(); showSuccess('Lead updated successfully'); await fetchLeadDetail();
    } catch (err) { setUpdateLeadError(err?.message || 'Failed to update lead'); }
    finally { setUpdatingLead(false); }
  }, [lead, leadForm, canManageLeadAssignment, closeEditLeadModal, showSuccess, fetchLeadDetail]);

  const handleAttachManualProduct = useCallback(async (productPayload, options = {}) => {
    if (!lead?._id) throw new Error('No lead loaded');
    const normalizedPhone = getPhonePayload(formatIndianPhoneInput(lead.phone || ''));
    if (!normalizedPhone || !validatePhone(normalizedPhone)) throw new Error('Add a valid 10-digit mobile on the lead before attaching a product.');
    await api.put(API_ROUTES.leads.update(lead._id), {
      name: String(lead.name || '').trim(), email: String(lead.email || '').trim(),
      phone: normalizedPhone, source: lead.source, leadType: lead.leadType || 'guest', status: lead.status || 'new',
      ...(canManageLeadAssignment ? { assignedTo: lead.assignedTo?._id || lead.assignedTo || null } : {}),
      ...productPayload,
    });
    setFinalPrice(null); setInitialFinalPrice(null); setInitialBreakdown(null);
    setPricingVariantsDraft([]); setPricingFormulaDraft({}); setSelectedProduct(null);
    await fetchLeadDetail();
    showSuccess(options?.isEdit ? 'Product updated on lead' : 'Product added to lead');
  }, [lead, canManageLeadAssignment, fetchLeadDetail, showSuccess]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">

        {loading && <LeadDetailsSkeleton />}

        {!loading && lead && (
          <>
            {/* Hero card */}
            <LeadHero
              lead={lead}
              onEdit={openEditLeadModal}
              onBack={() => navigate(lead?.isCompleted ? '/leads/completed' : '/leads')}
            />

            {/* Mark completed + SLA bar */}
            <LeadMarkCompletedPanel
              lead={lead}
              completion={completion}
              onCompleted={async () => { showSuccess('Lead marked as completed'); await fetchLeadDetail(); }}
            />

            {lead.stageId && !lead.isCompleted && (
              <LeadStageSlaBar
                leadId={lead._id}
                stageId={lead.stageId?._id || lead.stageId}
                isAdmin={user?.role === 'admin'}
                onNotify={(msg, type) => (type === 'error' ? showError(msg) : showSuccess(msg))}
              />
            )}

            {(lead.isCompleted || stageHistory.length > 0) && user?.role === 'admin' && (
              <LeadStageTimeline stages={stageHistory} />
            )}

            {/* Tab container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-800/90">
              <TabBar tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />

              <div className="min-h-[60vh]">
                {activeTab === 'related' && (
                  <RelatedLeadsPanel
                    loading={relatedLoading}
                    related={relatedLeads}
                    matchFields={relatedMatchFields}
                  />
                )}

                {activeTab === 'lead_details' && (
                  <LeadDetailsOverviewCard
                    lead={lead}
                    selectedProduct={selectedProduct}
                    setFinalPrice={setFinalPrice}
                    finalPrice={finalPrice}
                    initialFinalPrice={initialFinalPrice}
                    isFetchingFinalPrice={isFetchingFinalPrice}
                    pricingFormulaDraft={pricingFormulaDraft}
                    initialBreakdown={initialBreakdown}
                    pricingVariantsDraft={pricingVariantsDraft}
                    setInitialFinalPrice={setInitialFinalPrice}
                    setIsFetchingFinalPrice={setIsFetchingFinalPrice}
                    setPricingFormulaDraft={setPricingFormulaDraft}
                    setInitialBreakdown={setInitialBreakdown}
                    setPricingVariantsDraft={setPricingVariantsDraft}
                    onAttachManualProduct={handleAttachManualProduct}
                  />
                )}

                {activeTab === 'order' && leadHasOrder(lead) && (
                  <OrderDetailsTab
                    importerOrderId={lead.importerOrderId}
                    orderFetchId={leadOrderFetchId(lead)}
                    onError={showError}
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
                  <LeadNotes leadId={leadId} showError={showError} showSuccess={showSuccess} />
                )}

                {activeTab === 'quotes' && (
                  <QuotesTab lead={lead} showError={showError} />
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
          </>
        )}
      </div>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />

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
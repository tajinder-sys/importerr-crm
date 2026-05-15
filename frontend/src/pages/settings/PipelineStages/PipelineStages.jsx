import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { GitBranch, Plus } from 'lucide-react';

import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';
import ConfirmDialog from '../../../components/common/ui/ConfirmDialog';
import Snackbar from '../../../components/common/ui/Snackbar';

import PipelineHeader from './components/PipelineHeader';
import PipelineAccordion from './components/PipelineAccordion';
import PipelineModal from './components/PipelineModal';
import StageModal from './components/StageModal';

/* ─── Defaults ────────────────────────────────────────────────── */
const DEFAULT_PIPELINE_FORM = {
  name: '',
  description: '',
  teamId: '',
  isActive: true,
  isDefault: false,
};
const DEFAULT_STAGE_FORM = {
  name: '',
  description: '',
  pipelineId: '',
  order: 0,
  color: '#6366f1',
  isActive: true,
  isConversion: false,
  followUpDays: '',
  probabilityPercent: '',
};

const PipelineStages = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  /* ─── State ───────────────────────────────────────────────── */
  const [pipelines, setPipelines] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const [pipelineForm, setPipelineForm] = useState(DEFAULT_PIPELINE_FORM);
  const [stageForm, setStageForm] = useState(DEFAULT_STAGE_FORM);

  const notify = (message, type = 'success') => setSnackbar({ open: true, message, type });

  /* ─── Fetch ───────────────────────────────────────────────── */
  const fetchPipelines = async () => {
    try {
      const res = await api.get(API_ROUTES.pipelines.list, { params: { limit: 200 } });
      if (res.success) {
        const raw = res.data?.pipelines || res.data || [];
        setPipelines(raw);
      }
      else notify('Failed to load pipelines', 'error');
    } catch (e) {
      notify(e.message || 'Failed to load pipelines', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await api.get(API_ROUTES.teams.list);
      if (res.success) setTeams(res.data.teams || []);
    } catch (e) {
      notify(e.message || 'Failed to load teams', 'error');
    }
  };

  /* ─── Bootstrap ───────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => { await Promise.all([fetchPipelines(), fetchTeams()]); };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Pipeline CRUD ───────────────────────────────────────── */
  const handlePipelineSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = editingPipeline
        ? await api.put(API_ROUTES.pipelines.update(editingPipeline._id), pipelineForm)
        : await api.post(API_ROUTES.pipelines.create, pipelineForm);
      if (res.success) {
        notify(`Pipeline ${editingPipeline ? 'updated' : 'created'} successfully`);
        closePipelineModal();
        fetchPipelines();
      }       else notify(res.message || 'Failed to save pipeline', 'error');
    } catch (e) { notify(e.message || 'Failed to save pipeline', 'error'); }
  };

  const handlePatchPipeline = async (pipelineId, patch) => {
    try {
      const res = await api.put(API_ROUTES.pipelines.update(pipelineId), patch);
      if (res.success) {
        notify('Pipeline updated');
        fetchPipelines();
      } else notify(res.message || 'Failed to update pipeline', 'error');
    } catch (e) {
      notify(e.message || 'Failed to update pipeline', 'error');
    }
  };

  /* ─── Stage CRUD ──────────────────────────────────────────── */
  const handleStageSubmit = async (e) => {
    e.preventDefault();
    try {
      const pipelineId =
        typeof stageForm.pipelineId === 'object' && stageForm.pipelineId !== null
          ? stageForm.pipelineId._id
          : stageForm.pipelineId;

      const followRaw =
        typeof stageForm.followUpDays === 'string'
          ? stageForm.followUpDays.trim()
          : stageForm.followUpDays === undefined || stageForm.followUpDays === null
            ? ''
            : String(stageForm.followUpDays);

      const probRaw =
        typeof stageForm.probabilityPercent === 'string'
          ? stageForm.probabilityPercent.trim()
          : stageForm.probabilityPercent === undefined || stageForm.probabilityPercent === null
            ? ''
            : String(stageForm.probabilityPercent);

      const followUpDays = followRaw === '' ? null : Number(followRaw);
      const probabilityPercent = probRaw === '' ? null : Number(probRaw);

      const payload = {
        ...stageForm,
        pipelineId,
        order: Number(stageForm.order),
        followUpDays: Number.isFinite(followUpDays) ? followUpDays : null,
        probabilityPercent: Number.isFinite(probabilityPercent) ? probabilityPercent : null,
      };

      const res = editingStage
        ? await api.put(API_ROUTES.stages.update(editingStage._id), payload)
        : await api.post(API_ROUTES.stages.create, payload);
      if (res.success) {
        notify(`Stage ${editingStage ? 'updated' : 'created'} successfully`);
        closeStageModal();
        fetchPipelines();
      } else notify(res.message || 'Failed to save stage', 'error');
    } catch (e) { notify(e.message || 'Failed to save stage', 'error'); }
  };

  /* ─── Delete ──────────────────────────────────────────────── */
  const handleDelete = (type, id) => setDeleteConfirm({ isOpen: true, type, id });

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, type: null, id: null });
    try {
      const endpoint = type === 'pipeline'
        ? API_ROUTES.pipelines.delete(id)
        : API_ROUTES.stages.delete(id);
      const res = await api.delete(endpoint);
      if (res.success) {
        notify(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
        fetchPipelines();
      } else notify(`Failed to delete ${type}`, 'error');
    } catch (e) { notify(e.message || `Failed to delete ${type}`, 'error'); }
  };

  /* ─── Toggle ──────────────────────────────────────────────── */
  const handleToggleStage = async (id) => {
    try {
      const res = await api.patch(API_ROUTES.stages.toggle(id));
      if (res.success) { notify('Stage status updated'); fetchPipelines(); }
      else notify('Failed to update stage status', 'error');
    } catch (e) { notify(e.message || 'Failed to update stage status', 'error'); }
  };

  /* ─── Modal helpers ───────────────────────────────────────── */
  const openAddPipeline = () => {
    setEditingPipeline(null);
    setPipelineForm(DEFAULT_PIPELINE_FORM);
    setShowPipelineModal(true);
  };

  const openEditPipeline = (pipeline) => {
    setEditingPipeline(pipeline);
    const tid =
      typeof pipeline.teamId === 'object' && pipeline.teamId !== null
        ? pipeline.teamId._id
        : pipeline.teamId;
    setPipelineForm({
      name: pipeline.name,
      description: pipeline.description || '',
      teamId: tid || '',
      isActive: pipeline.isActive !== false,
      isDefault: !!pipeline.isDefault,
    });
    setShowPipelineModal(true);
  };

  const closePipelineModal = () => {
    setShowPipelineModal(false);
    setEditingPipeline(null);
    setPipelineForm(DEFAULT_PIPELINE_FORM);
  };

  const openAddStage = (pipelineId = '') => {
    setEditingStage(null);
    setStageForm({ ...DEFAULT_STAGE_FORM, pipelineId });
    setShowStageModal(true);
  };

  const openEditStage = (stage) => {
    setEditingStage(stage);
    const pipelineId =
      typeof stage.pipelineId === 'object' && stage.pipelineId !== null
        ? stage.pipelineId._id
        : stage.pipelineId;
    setStageForm({
      name: stage.name,
      description: stage.description || '',
      pipelineId,
      order: stage.order,
      color: stage.color || '#6366f1',
      isActive: stage.isActive,
      isConversion: stage.isConversion || false,
      followUpDays: stage.followUpDays ?? '',
      probabilityPercent: stage.probabilityPercent ?? '',
    });
    setShowStageModal(true);
  };

  const closeStageModal = () => {
    setShowStageModal(false);
    setEditingStage(null);
    setStageForm(DEFAULT_STAGE_FORM);
  };

  /* ─── Derived ─────────────────────────────────────────────── */
  const getStagesForPipeline = (pipeline) => {
    const s = pipeline.stages || [];
    return [...s].sort((a, b) => a.order - b.order);
  };

  const getTeamName = (pipeline) => {
    if (pipeline.teamId?.name) return pipeline.teamId.name;
    const tid =
      typeof pipeline.teamId === 'object' && pipeline.teamId !== null
        ? pipeline.teamId._id
        : pipeline.teamId;
    const found = teams.find((t) => t._id === tid);
    return found?.name || null;
  };

  const totalStages = pipelines.reduce((acc, p) => acc + (p.stages?.length || 0), 0);

  /* ─── Guard ───────────────────────────────────────────────── */
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">

        <PipelineHeader
          totalPipelines={pipelines.length}
          totalStages={totalStages}
          onAddPipeline={openAddPipeline}
          onAddStage={() => openAddStage()}
        />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <span className="text-sm text-slate-400">Loading pipeline configuration…</span>
          </div>
        )}

        {/* Empty */}
        {!loading && pipelines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 mb-4 dark:bg-indigo-900/30">
              <GitBranch size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1 dark:text-slate-200">No Pipelines Yet</h3>
            <p className="text-sm text-slate-400 text-center max-w-sm mb-6 dark:text-slate-500">
              Create your first pipeline to structure your sales process.
            </p>
            <button
              onClick={openAddPipeline}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all hover:-translate-y-px"
            >
              <Plus size={15} /> Create First Pipeline
            </button>
          </div>
        )}

        {/* Accordion list */}
        {!loading && pipelines.length > 0 && (
          <div className="flex flex-col gap-3">
            {pipelines.map((pipeline, i) => (
              <PipelineAccordion
                key={pipeline._id}
                pipeline={pipeline}
                stages={getStagesForPipeline(pipeline)}
                teamName={getTeamName(pipeline)}
                defaultOpen={i === 0}
                onEditPipeline={openEditPipeline}
                onPatchPipeline={handlePatchPipeline}
                onAddStage={openAddStage}
                onEditStage={openEditStage}
                onDeleteStage={handleDelete}
                onToggleStage={handleToggleStage}
              />
            ))}
          </div>
        )}

      </div>

      {/* Modals */}
      <PipelineModal
        isOpen={showPipelineModal}
        onClose={closePipelineModal}
        onSubmit={handlePipelineSubmit}
        formData={pipelineForm}
        setFormData={setPipelineForm}
        teams={teams}
        isEditing={!!editingPipeline}
      />

      <StageModal
        isOpen={showStageModal}
        onClose={closeStageModal}
        onSubmit={handleStageSubmit}
        formData={stageForm}
        setFormData={setStageForm}
        pipelines={pipelines}
        isEditing={!!editingStage}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
        onConfirm={confirmDelete}
        title={`Delete ${deleteConfirm.type}`}
        message={`Are you sure you want to delete this ${deleteConfirm.type}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default PipelineStages;
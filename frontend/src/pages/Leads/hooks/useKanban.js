import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';

const useKanban = () => {
  /* ── Pipelines ─────────────────────────────────────── */
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');

  /* ── Stages & leads ────────────────────────────────── */
  const [activeStages, setActiveStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});   // { [stageId]: Lead[] }
  const [loadingStages, setLoadingStages] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);

  /* ── Snackbar / notify ─────────────────────────────── */
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const notify = useCallback((message, type = 'success') => {
    console.log('notify', message, type);
    setSnackbar({ open: true, message, type });
  }, []);

  /* ── Derived: active pipeline object ───────────────── */
  const activePipeline = pipelines.find((p) => p._id === selectedPipelineId) || null;

  /* ── 1. Load pipelines on mount ────────────────────── */
  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const res = await api.get(API_ROUTES.pipelines.list);
        const list = res?.data?.pipelines || res?.data || [];
        setPipelines(list);
        if (list.length > 0 && !selectedPipelineId) {
          setSelectedPipelineId(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load pipelines', err);
      }
    };
    fetchPipelines();
  }, []);

  /* ── 2. Load stages when pipeline changes ──────────── */
  useEffect(() => {
    if (!selectedPipelineId) return;
    const fetchStages = async () => {
      setLoadingStages(true);
      try {
        const res = await api.get(API_ROUTES.stages.list, {
          params: { pipelineId: selectedPipelineId },
        });
        const stages = (res?.data?.stages || res?.data || []).filter((s) => s.isActive);
        setActiveStages(stages);
      } catch (err) {
        console.error('Failed to load stages', err);
        setActiveStages([]);
      } finally {
        setLoadingStages(false);
      }
    };
    fetchStages();
  }, [selectedPipelineId]);

  useEffect(() => {
    if (activeStages.length === 0) { setLeadsByStage({}); return; }
    fetchAllStageLeads(activeStages);
  }, [activeStages]);

  const fetchAllStageLeads = useCallback(async (stages) => {
    if (!selectedPipelineId) return;
    try {
      const res = await api.get(API_ROUTES.leads.list, {
        params: {
          pipelineId: selectedPipelineId,
          limit: 1000,
        },
      });

      const allLeads = res?.data?.leads || [];

      // Group leads by stageId — initialise every stage with an empty array
      const map = {};
      stages.forEach((s) => { map[s._id] = []; });

      allLeads.forEach((lead) => {
        // stageId may be a populated object or a plain string
        const sid = lead?.stageId?._id || lead?.stageId;
        if (sid && map[sid] !== undefined) {
          map[sid].push(lead);
        }
      });

      setLeadsByStage(map);
      setTotalLeads(allLeads.length);
    } catch (err) {
      console.error('Failed to fetch leads for pipeline', err);
    }
  }, [selectedPipelineId]);

  /* ── Refresh a single stage's leads (re-fetches whole pipeline, regroups) ── */
  const refreshStage = useCallback(async () => {
    if (activeStages.length > 0) fetchAllStageLeads(activeStages);
  }, [activeStages, fetchAllStageLeads]);

  /* ── Refresh all stages ────────────────────────────── */
  const refreshAllStages = useCallback(() => {
    if (activeStages.length > 0) fetchAllStageLeads(activeStages);
  }, [activeStages, fetchAllStageLeads]);

  return {
    // Pipeline
    pipelines,
    selectedPipelineId,
    activePipeline,
    setSelectedPipelineId,

    // Stages & leads
    activeStages,
    leadsByStage,
    loadingStages,
    totalLeads,
    setLeadsByStage,

    // Refresh
    refreshStage,
    refreshAllStages,

    // Notifications
    snackbar,
    setSnackbar,
    notify,
  };
};

export default useKanban;
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';
import { KANBAN_PAGE_SIZE, defaultKanbanListQuery } from './kanbanPaginationConstants';

const emptyMeta = () => ({
  total: 0,
  page: 1,
  loadingMore: false,
  listQuery: defaultKanbanListQuery(),
});

const useKanban = () => {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');

  const [activeStages, setActiveStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [stageKanbanMeta, setStageKanbanMeta] = useState({});
  const [loadingStages, setLoadingStages] = useState(false);

  const stageStateRef = useRef({ leadsByStage: {}, stageKanbanMeta: {} });
  useEffect(() => {
    stageStateRef.current = { leadsByStage, stageKanbanMeta };
  }, [leadsByStage, stageKanbanMeta]);

  const fetchLockRef = useRef({});

  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const notify = useCallback((message, type = 'success') => {
    setSnackbar({ open: true, message, type });
  }, []);

  const activePipeline = pipelines.find((p) => p._id === selectedPipelineId) || null;

  useEffect(() => {
    const fetchPipelines = async () => {
      try {
        const res = await api.get(API_ROUTES.pipelines.list, {
          params: { isActive: true, limit: 200 },
        });
        const list = res?.data?.pipelines || res?.data || [];
        const sorted = [...list].sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
            sensitivity: 'base',
          });
        });
        setPipelines(sorted);
        setSelectedPipelineId((prev) => {
          if (prev && sorted.some((p) => p._id === prev)) return prev;
          return sorted[0]?._id || '';
        });
      } catch (err) {
        console.error('Failed to load pipelines', err);
      }
    };
    fetchPipelines();
  }, []);

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

  const fetchStagePage = useCallback(
    async (stageId, { page, limit, listQuery }) => {
      const q =
        listQuery ??
        stageStateRef.current.stageKanbanMeta[stageId]?.listQuery ??
        defaultKanbanListQuery();
      const safePage = Math.max(1, page);

      const paramsBase = {
        pipelineId: selectedPipelineId,
        stageId,
        limit,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
      };
      if (q.status) paramsBase.status = q.status;
      if (q.source) paramsBase.source = q.source;
      if (q.assignedTo) paramsBase.assignedTo = q.assignedTo;
      const s = (q.search || '').trim();
      if (s) paramsBase.search = s;

      const run = (skip) =>
        api.get(API_ROUTES.leads.list, {
          params: { ...paramsBase, skip },
        });

      let skip = (safePage - 1) * limit;
      let res = await run(skip);
      let leads = res?.data?.leads || [];
      let total =
        typeof res?.data?.pagination?.total === 'number'
          ? res.data.pagination.total
          : leads.length;
      const maxPage = Math.max(1, Math.ceil(total / limit));
      let resolvedPage = Math.min(safePage, maxPage);
      if (resolvedPage !== safePage) {
        skip = (resolvedPage - 1) * limit;
        res = await run(skip);
        leads = res?.data?.leads || [];
        total =
          typeof res?.data?.pagination?.total === 'number'
            ? res.data.pagination.total
            : leads.length;
      }
      return { leads, total, page: resolvedPage };
    },
    [selectedPipelineId],
  );

  const bootstrapKanbanLeads = useCallback(
    async (stages) => {
      if (!selectedPipelineId || !stages?.length) return;
      setLoadingStages(true);
      fetchLockRef.current = {};

      const map = {};
      const meta = {};

      await Promise.all(
        stages.map(async (s) => {
          const id = s._id;
          const listQuery = defaultKanbanListQuery();
          try {
            const { leads, total, page } = await fetchStagePage(id, {
              page: 1,
              limit: KANBAN_PAGE_SIZE,
              listQuery,
            });
            map[id] = leads;
            meta[id] = { total, page, loadingMore: false, listQuery };
          } catch (e) {
            console.error('Stage lead bootstrap failed', id, e);
            map[id] = [];
            meta[id] = { ...emptyMeta(), listQuery };
          }
        }),
      );

      setLeadsByStage(map);
      setStageKanbanMeta(meta);
      setLoadingStages(false);
    },
    [selectedPipelineId, fetchStagePage],
  );

  useEffect(() => {
    if (activeStages.length === 0) {
      setLeadsByStage({});
      setStageKanbanMeta({});
      return;
    }
    bootstrapKanbanLeads(activeStages);
  }, [activeStages, bootstrapKanbanLeads]);

  const goToStagePage = useCallback(
    async (stageId, page) => {
      if (!selectedPipelineId || !stageId) return;
      if (fetchLockRef.current[stageId]) return;

      const m = stageStateRef.current.stageKanbanMeta[stageId] || emptyMeta();
      const listQuery = m.listQuery || defaultKanbanListQuery();

      fetchLockRef.current[stageId] = true;
      setStageKanbanMeta((prev) => ({
        ...prev,
        [stageId]: { ...(prev[stageId] || emptyMeta()), loadingMore: true },
      }));

      try {
        const { leads, total, page: resolvedPage } = await fetchStagePage(stageId, {
          page,
          limit: KANBAN_PAGE_SIZE,
          listQuery,
        });
        setLeadsByStage((p) => ({ ...p, [stageId]: leads }));
        setStageKanbanMeta((p) => ({
          ...p,
          [stageId]: {
            ...(p[stageId] || emptyMeta()),
            total,
            page: resolvedPage,
            loadingMore: false,
            listQuery,
          },
        }));
      } catch (err) {
        console.error('goToStagePage', stageId, err);
        setStageKanbanMeta((prev) => ({
          ...prev,
          [stageId]: { ...(prev[stageId] || emptyMeta()), loadingMore: false },
        }));
      } finally {
        delete fetchLockRef.current[stageId];
      }
    },
    [selectedPipelineId, fetchStagePage],
  );

  const updateStageListQuery = useCallback(
    async (stageId, patch) => {
      if (!selectedPipelineId || !stageId) return;
      if (fetchLockRef.current[stageId]) return;

      const prevMeta = stageStateRef.current.stageKanbanMeta[stageId] || emptyMeta();
      const listQuery = { ...(prevMeta.listQuery || defaultKanbanListQuery()), ...patch };

      fetchLockRef.current[stageId] = true;
      setStageKanbanMeta((prev) => ({
        ...prev,
        [stageId]: { ...(prev[stageId] || emptyMeta()), listQuery, loadingMore: true },
      }));

      try {
        const { leads, total, page } = await fetchStagePage(stageId, {
          page: 1,
          limit: KANBAN_PAGE_SIZE,
          listQuery,
        });
        setLeadsByStage((p) => ({ ...p, [stageId]: leads }));
        setStageKanbanMeta((p) => ({
          ...p,
          [stageId]: {
            ...(p[stageId] || emptyMeta()),
            total,
            page,
            loadingMore: false,
            listQuery,
          },
        }));
      } catch (e) {
        console.error('updateStageListQuery', stageId, e);
        setStageKanbanMeta((p) => ({
          ...p,
          [stageId]: { ...(p[stageId] || emptyMeta()), listQuery, loadingMore: false },
        }));
      } finally {
        delete fetchLockRef.current[stageId];
      }
    },
    [selectedPipelineId, fetchStagePage],
  );

  const refreshStage = useCallback(
    async (stageId) => {
      if (!selectedPipelineId) return;
      if (stageId) {
        try {
          const meta = stageStateRef.current.stageKanbanMeta[stageId] || emptyMeta();
          const listQuery = meta.listQuery ?? defaultKanbanListQuery();
          const page = meta.page || 1;
          const { leads, total, page: resolvedPage } = await fetchStagePage(stageId, {
            page,
            limit: KANBAN_PAGE_SIZE,
            listQuery,
          });
          setLeadsByStage((p) => ({ ...p, [stageId]: leads }));
          setStageKanbanMeta((p) => ({
            ...p,
            [stageId]: {
              ...(p[stageId] || emptyMeta()),
              total,
              page: resolvedPage,
              loadingMore: false,
              listQuery,
            },
          }));
        } catch (e) {
          console.error('refreshStage', e);
        }
        return;
      }
      if (activeStages.length) await bootstrapKanbanLeads(activeStages);
    },
    [selectedPipelineId, activeStages, bootstrapKanbanLeads, fetchStagePage],
  );

  const refreshAllStages = useCallback(() => {
    if (activeStages.length) bootstrapKanbanLeads(activeStages);
  }, [activeStages, bootstrapKanbanLeads]);

  return {
    pipelines,
    selectedPipelineId,
    activePipeline,
    setSelectedPipelineId,

    activeStages,
    leadsByStage,
    stageKanbanMeta,
    loadingStages,
    setLeadsByStage,
    setStageKanbanMeta,
    goToStagePage,
    updateStageListQuery,

    refreshStage,
    refreshAllStages,

    snackbar,
    setSnackbar,
    notify,
  };
};

export default useKanban;

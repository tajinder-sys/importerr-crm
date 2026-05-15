import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import api from '../../../../utils/api';
import { API_ROUTES } from '../../../../utils/apiRoutes';
import { KANBAN_PAGE_SIZE, defaultKanbanListQuery } from './kanbanPaginationConstants';

const emptyMeta = () => ({
  total: 0,
  page: 1,
  loadingMore: false,
  listQuery: defaultKanbanListQuery(),
});

const useKanban = (globalAssignedTo = '', dateParams = {}) => {
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
  const pipelineLoadGenRef = useRef(0);
  const selectedPipelineIdRef = useRef(selectedPipelineId);
  const globalAssignedToRef = useRef(globalAssignedTo);
  const dateParamsRef = useRef(dateParams);
  const assigneeFilterMountedRef = useRef(false);
  const activeStagesRef = useRef([]);

  useEffect(() => { selectedPipelineIdRef.current = selectedPipelineId; }, [selectedPipelineId]);
  useEffect(() => { activeStagesRef.current = activeStages; }, [activeStages]);
  useEffect(() => { globalAssignedToRef.current = globalAssignedTo; }, [globalAssignedTo]);
  useEffect(() => { dateParamsRef.current = dateParams; }, [dateParams]);

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
        setPipelines(list);
        setSelectedPipelineId((prev) => {
          if (prev && list.some((p) => p._id === prev)) return prev;
          return list[0]?._id || '';
        });
      } catch (err) {
        console.error('Failed to load pipelines', err);
      }
    };
    fetchPipelines();
  }, []);

  const fetchStagePage = useCallback(async (stageId, { page, limit, listQuery }) => {
    const pipelineId = selectedPipelineIdRef.current;
    if (!pipelineId) return { leads: [], total: 0, page: 1 };

    const q =
      listQuery ??
      stageStateRef.current.stageKanbanMeta[stageId]?.listQuery ??
      defaultKanbanListQuery();
    const safePage = Math.max(1, page);

    const paramsBase = {
      pipelineId,
      stageId,
      limit,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
    };
    if (q.status) paramsBase.status = q.status;
    if (q.source) paramsBase.source = q.source;
    if (globalAssignedToRef.current) paramsBase.assignedTo = globalAssignedToRef.current;
    if (dateParamsRef.current?.dateFrom) paramsBase.dateFrom = dateParamsRef.current.dateFrom;
    if (dateParamsRef.current?.dateTo) paramsBase.dateTo = dateParamsRef.current.dateTo;
    const s = (q.search || '').trim();
    if (s) paramsBase.search = s;

    const run = (skip) =>
      api.get(API_ROUTES.leads.list, { params: { ...paramsBase, skip } });

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
  }, []);

  const loadLeadsForStages = useCallback(async (stages, expectedGen) => {
    const pipelineId = selectedPipelineIdRef.current;
    if (!pipelineId || !stages?.length) return;
    if (expectedGen != null && expectedGen !== pipelineLoadGenRef.current) return;

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
          if (expectedGen != null && expectedGen !== pipelineLoadGenRef.current) return;
          map[id] = leads;
          meta[id] = { total, page, loadingMore: false, listQuery };
        } catch (e) {
          console.error('Stage lead bootstrap failed', id, e);
          map[id] = [];
          meta[id] = { ...emptyMeta(), listQuery };
        }
      }),
    );

    if (expectedGen != null && expectedGen !== pipelineLoadGenRef.current) return;
    setLeadsByStage(map);
    setStageKanbanMeta(meta);
  }, [fetchStagePage]);

  // Load stages + leads when pipeline changes
  useEffect(() => {
    if (!selectedPipelineId) {
      startTransition(() => {
        setActiveStages([]);
        setLeadsByStage({});
        setStageKanbanMeta({});
      });
      return;
    }

    const gen = ++pipelineLoadGenRef.current;
    startTransition(() => {
      setActiveStages([]);
      setLeadsByStage({});
      setStageKanbanMeta({});
      setLoadingStages(true);
    });

    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(API_ROUTES.stages.list, {
          params: { pipelineId: selectedPipelineId },
        });
        if (cancelled || gen !== pipelineLoadGenRef.current) return;

        const stages = (res?.data?.stages || res?.data || []).filter((s) => s.isActive);
        setActiveStages(stages);

        if (stages.length) {
          await loadLeadsForStages(stages, gen);
        }
      } catch (err) {
        if (!cancelled && gen === pipelineLoadGenRef.current) {
          console.error('Failed to load stages', err);
          setActiveStages([]);
        }
      } finally {
        if (!cancelled && gen === pipelineLoadGenRef.current) {
          setLoadingStages(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selectedPipelineId, loadLeadsForStages]);

  // Re-fetch when assignee filter changes (skip on mount)
  useEffect(() => {
    if (!assigneeFilterMountedRef.current) {
      assigneeFilterMountedRef.current = true;
      return;
    }
    if (!selectedPipelineIdRef.current || activeStagesRef.current.length === 0) return;

    const gen = pipelineLoadGenRef.current;
    let cancelled = false;
    setLoadingStages(true);

    (async () => {
      try {
        await loadLeadsForStages(activeStagesRef.current, gen);
      } finally {
        if (!cancelled && gen === pipelineLoadGenRef.current) setLoadingStages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [globalAssignedTo, loadLeadsForStages]);

  // Re-fetch when date filter changes
  const prevDateRef = useRef({ dateFrom: dateParams?.dateFrom, dateTo: dateParams?.dateTo });
  useEffect(() => {
    const prev = prevDateRef.current;
    const changed =
      prev.dateFrom !== dateParams?.dateFrom ||
      prev.dateTo !== dateParams?.dateTo;
    if (!changed) return;
    prevDateRef.current = { dateFrom: dateParams?.dateFrom, dateTo: dateParams?.dateTo };
    if (!selectedPipelineIdRef.current || activeStagesRef.current.length === 0) return;

    const gen = pipelineLoadGenRef.current;
    let cancelled = false;
    setLoadingStages(true);

    (async () => {
      try {
        await loadLeadsForStages(activeStagesRef.current, gen);
      } finally {
        if (!cancelled && gen === pipelineLoadGenRef.current) setLoadingStages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [dateParams?.dateFrom, dateParams?.dateTo, loadLeadsForStages]);

  const goToStagePage = useCallback(async (stageId, page) => {
    if (!selectedPipelineIdRef.current || !stageId) return;
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
        [stageId]: { ...(p[stageId] || emptyMeta()), total, page: resolvedPage, loadingMore: false, listQuery },
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
  }, [fetchStagePage]);

  const updateStageListQuery = useCallback(async (stageId, patch) => {
    if (!selectedPipelineIdRef.current || !stageId) return;
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
        [stageId]: { ...(p[stageId] || emptyMeta()), total, page, loadingMore: false, listQuery },
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
  }, [fetchStagePage]);

  const refreshStage = useCallback(async (stageId) => {
    if (!selectedPipelineIdRef.current) return;
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
          [stageId]: { ...(p[stageId] || emptyMeta()), total, page: resolvedPage, loadingMore: false, listQuery },
        }));
      } catch (e) {
        console.error('refreshStage', e);
      }
      return;
    }
    if (activeStages.length) {
      setLoadingStages(true);
      try {
        await loadLeadsForStages(activeStages, pipelineLoadGenRef.current);
      } finally {
        setLoadingStages(false);
      }
    }
  }, [activeStages, loadLeadsForStages, fetchStagePage]);

  const refreshAllStages = useCallback(async () => {
    if (!activeStages.length) return;
    setLoadingStages(true);
    try {
      await loadLeadsForStages(activeStages, pipelineLoadGenRef.current);
    } finally {
      setLoadingStages(false);
    }
  }, [activeStages, loadLeadsForStages]);

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

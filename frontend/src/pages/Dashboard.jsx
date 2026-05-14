import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { API_ROUTES } from '../utils/apiRoutes';
import { USER_ROLES } from '../utils/constants';
import DashboardFilterBar from './Dashboard/DashboardFilterBar';
import DashboardKpiSection from './Dashboard/DashboardKpiSection';
import DashboardTasksSection from './Dashboard/DashboardTasksSection';
import DashboardTimelineSection from './Dashboard/DashboardTimelineSection';
import DashboardPipelineWinRatesSection from './Dashboard/DashboardPipelineWinRatesSection';
import DashboardSourcesSection from './Dashboard/DashboardSourcesSection';
import DashboardStagesSection from './Dashboard/DashboardStagesSection';
import DashboardRecentLeadsSection from './Dashboard/DashboardRecentLeadsSection';
import DashboardUserPerformanceSection from './Dashboard/DashboardUserPerformanceSection';

const greetingForHour = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const emptySection = { loading: true, error: '', data: null };

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const showOwnerFilter = isAdmin || user?.role === USER_ROLES.TEAM_MANAGER;

  const [filtersMeta, setFiltersMeta] = useState({ loading: true, error: '', data: null });
  const [filters, setFilters] = useState({
    period: 'all',
    source: 'all',
    pipeline: 'all',
    owner: 'all'
  });

  const [kpis, setKpis] = useState(emptySection);
  const [stages, setStages] = useState(emptySection);
  const [sources, setSources] = useState(emptySection);
  const [userPerf, setUserPerf] = useState(emptySection);
  const [tasksSum, setTasksSum] = useState(emptySection);
  const [recent, setRecent] = useState(emptySection);
  const [timeline, setTimeline] = useState(emptySection);
  const [pipelineRates, setPipelineRates] = useState(emptySection);
  const [lastUpdated, setLastUpdated] = useState(null);

  const buildParams = useCallback(() => {
    const p = { days: filters.period === 'all' ? 'all' : filters.period };
    if (filters.source && filters.source !== 'all') p.source = filters.source;
    if (filters.pipeline && filters.pipeline !== 'all') p.pipelineId = filters.pipeline;
    if (filters.owner && filters.owner !== 'all') p.userId = filters.owner;
    return p;
  }, [filters.period, filters.source, filters.pipeline, filters.owner]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFiltersMeta((s) => ({ ...s, loading: true, error: '' }));
      try {
        const res = await api.get(API_ROUTES.dashboard.filters);
        if (!cancelled) setFiltersMeta({ loading: false, error: '', data: res?.data ?? null });
      } catch (err) {
        if (!cancelled)
          setFiltersMeta({ loading: false, error: err?.message || 'Failed to load filters', data: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = buildParams();
    let cancelled = false;

    const run = async (setter, path) => {
      setter({ loading: true, error: '', data: null });
      try {
        const res = await api.get(path, { params });
        if (!cancelled) setter({ loading: false, error: '', data: res?.data ?? null });
      } catch (err) {
        if (!cancelled) setter({ loading: false, error: err?.message || 'Failed to load', data: null });
      }
    };

    const requests = [
      run(setKpis, API_ROUTES.dashboard.kpis),
      run(setStages, API_ROUTES.dashboard.stages),
      run(setSources, API_ROUTES.dashboard.sources),
      run(setUserPerf, API_ROUTES.dashboard.userPerformance),
      run(setTasksSum, API_ROUTES.dashboard.tasksSummary),
      run(setRecent, API_ROUTES.dashboard.recentLeads),
      run(setTimeline, API_ROUTES.dashboard.leadTimeline),
      run(setPipelineRates, API_ROUTES.dashboard.pipelineWinRates),
    ];

    Promise.allSettled(requests).then(() => {
      if (!cancelled) setLastUpdated(Date.now());
    });

    return () => {
      cancelled = true;
    };
  }, [buildParams]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const pipelineOptions = useMemo(() => {
    const list = filtersMeta.data?.pipelines || [];
    return [
      { value: 'all', label: 'All pipelines' },
      ...list.map((p) => ({
        value: String(p._id),
        label: p.teamId?.name ? `${p.name} (${p.teamId.name})` : p.name
      }))
    ];
  }, [filtersMeta.data]);

  const sourceOptions = useMemo(() => {
    const list = filtersMeta.data?.sources || [];
    return [{ value: 'all', label: 'All sources' }, ...list.map((s) => ({ value: s.value, label: s.label }))];
  }, [filtersMeta.data]);

  const ownerOptions = useMemo(() => {
    const list = filtersMeta.data?.users || [];
    return [{ value: 'all', label: 'All users' }, ...list.map((u) => ({ value: String(u._id), label: u.name || u.email }))];
  }, [filtersMeta.data]);

  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const updatedLabel =
    lastUpdated &&
    new Date(lastUpdated).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <DashboardFilterBar
            greeting={greeting}
            displayName={displayName}
            isAdmin={isAdmin}
            filtersMeta={filtersMeta}
            filters={filters}
            setFilters={setFilters}
            handleFilterChange={handleFilterChange}
            pipelineOptions={pipelineOptions}
            sourceOptions={sourceOptions}
            ownerOptions={ownerOptions}
            showOwnerFilter={showOwnerFilter}
            updatedLabel={updatedLabel}
          />

          <DashboardKpiSection kpis={kpis} />

          <DashboardPipelineWinRatesSection pipelineRates={pipelineRates} />

          <DashboardTasksSection tasksSum={tasksSum} />

          <DashboardTimelineSection timeline={timeline} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <DashboardSourcesSection sources={sources} />
            <DashboardStagesSection stages={stages} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <DashboardRecentLeadsSection recent={recent} />
            <DashboardUserPerformanceSection userPerf={userPerf} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

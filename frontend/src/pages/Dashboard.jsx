import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { API_ROUTES } from '../utils/apiRoutes';
import { USER_ROLES } from '../utils/constants';
import DashboardFilterBar from './Dashboard/DashboardFilterBar';
import DashboardKpiSection from './Dashboard/DashboardKpiSection';
import DashboardTimelineSection from './Dashboard/DashboardTimelineSection';
import DashboardPipelineWinRatesSection from './Dashboard/DashboardPipelineWinRatesSection';
import DashboardSourcesSection from './Dashboard/DashboardSourcesSection';
import DashboardStagesSection from './Dashboard/DashboardStagesSection';
import DashboardUserPerformanceSection from './Dashboard/DashboardUserPerformanceSection';
import DashboardSlaAlertsSection from './Dashboard/DashboardSlaAlertsSection';

const greetingForHour = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const emptySection = { loading: true, error: '', data: null };

const SECTION_API = {
  kpis: API_ROUTES.dashboard.kpis,
  stages: API_ROUTES.dashboard.stages,
  sources: API_ROUTES.dashboard.sources,
  user_performance: API_ROUTES.dashboard.userPerformance,
  timeline: API_ROUTES.dashboard.leadTimeline,
  pipeline_win_rates: API_ROUTES.dashboard.pipelineWinRates,
};

const PAIR_GRIDS = [['sources', 'stages']];

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const showOwnerFilter = isAdmin || user?.role === USER_ROLES.TEAM_MANAGER;

  const [sectionConfig, setSectionConfig] = useState({
    loading: true,
    sections: [],
    visibility: {},
  });

  const [filtersMeta, setFiltersMeta] = useState({ loading: true, error: '', data: null });
  const [filters, setFilters] = useState({
    period: 'all',
    source: 'all',
    pipeline: 'all',
    stage: 'all',
    owner: 'all',
  });
  const [stageOptions, setStageOptions] = useState([{ value: 'all', label: 'All stages' }]);
  const [stagesLoading, setStagesLoading] = useState(false);

  const [kpis, setKpis] = useState(emptySection);
  const [stages, setStages] = useState(emptySection);
  const [sources, setSources] = useState(emptySection);
  const [userPerf, setUserPerf] = useState(emptySection);
  const [timeline, setTimeline] = useState(emptySection);
  const [pipelineRates, setPipelineRates] = useState(emptySection);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isVisible = useCallback(
    (key) => {
      if (sectionConfig.loading) return true;
      return sectionConfig.visibility[key] !== false;
    },
    [sectionConfig.loading, sectionConfig.visibility]
  );

  const buildParams = useCallback(() => {
    const p = { days: filters.period === 'all' ? 'all' : filters.period };
    if (filters.source && filters.source !== 'all') p.source = filters.source;
    if (filters.pipeline && filters.pipeline !== 'all') p.pipelineId = filters.pipeline;
    if (filters.stage && filters.stage !== 'all') p.stageId = filters.stage;
    if (filters.owner && filters.owner !== 'all') p.userId = filters.owner;
    return p;
  }, [filters.period, filters.source, filters.pipeline, filters.stage, filters.owner]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(API_ROUTES.dashboard.sections);
        if (!cancelled && res?.success) {
          setSectionConfig({
            loading: false,
            sections: res.data?.sections || [],
            visibility: res.data?.visibility || {},
          });
        } else if (!cancelled) {
          setSectionConfig({ loading: false, sections: [], visibility: {} });
        }
      } catch {
        if (!cancelled) setSectionConfig({ loading: false, sections: [], visibility: {} });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!filters.pipeline || filters.pipeline === 'all') {
      setStageOptions([{ value: 'all', label: 'All stages' }]);
      setStagesLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setStagesLoading(true);
      try {
        const res = await api.get(API_ROUTES.stages.list, { params: { pipelineId: filters.pipeline } });
        const list = (res?.data?.stages || []).filter((s) => s.isActive !== false);
        if (!cancelled) {
          setStageOptions([
            { value: 'all', label: 'All stages' },
            ...list.map((s) => ({ value: String(s._id), label: s.name || 'Stage' })),
          ]);
        }
      } catch {
        if (!cancelled) setStageOptions([{ value: 'all', label: 'All stages' }]);
      } finally {
        if (!cancelled) setStagesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters.pipeline]);

  useEffect(() => {
    if (sectionConfig.loading) return;

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

    const stateByKey = {
      kpis: [setKpis],
      stages: [setStages],
      sources: [setSources],
      user_performance: [setUserPerf],
      timeline: [setTimeline],
      pipeline_win_rates: [setPipelineRates],
    };

    const requests = [];
    for (const [key, path] of Object.entries(SECTION_API)) {
      if (!isVisible(key)) continue;
      const [setter] = stateByKey[key] || [];
      if (setter) requests.push(run(setter, path));
    }

    Promise.allSettled(requests).then(() => {
      if (!cancelled) setLastUpdated(Date.now());
    });

    return () => {
      cancelled = true;
    };
  }, [buildParams, sectionConfig.loading, sectionConfig.visibility, isVisible]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'pipeline') {
        next.stage = 'all';
      }
      return next;
    });
  };

  const pipelineOptions = useMemo(() => {
    const list = filtersMeta.data?.pipelines || [];
    return [
      { value: 'all', label: 'All pipelines' },
      ...list.map((p) => ({
        value: String(p._id),
        label: p.teamId?.name ? `${p.name} (${p.teamId.name})` : p.name,
      })),
    ];
  }, [filtersMeta.data]);

  const sourceOptions = useMemo(() => {
    const list = filtersMeta.data?.sources || [];
    return [{ value: 'all', label: 'All sources' }, ...list.map((s) => ({ value: s.value, label: s.label }))];
  }, [filtersMeta.data]);

  const ownerOptions = useMemo(() => {
    const list = filtersMeta.data?.users || [];
    return [
      { value: 'all', label: 'All users' },
      ...list.map((u) => ({ value: String(u._id), label: u.name || u.email })),
    ];
  }, [filtersMeta.data]);

  const orderedVisible = useMemo(() => {
    const list = sectionConfig.sections?.length
      ? [...sectionConfig.sections]
      : Object.keys(SECTION_API).map((key, i) => ({ key, order: (i + 1) * 10, visible: true }));
    return list
      .filter((s) => isVisible(s.key))
      .sort((a, b) => a.order - b.order || String(a.key).localeCompare(String(b.key)));
  }, [sectionConfig.sections, isVisible]);

  const renderSection = (key) => {
    switch (key) {
      case 'kpis':
        return <DashboardKpiSection key={key} kpis={kpis} />;
      case 'sla_alerts':
        return <DashboardSlaAlertsSection key={key} user={user} filtersMeta={filtersMeta} />;
      case 'pipeline_win_rates':
        return <DashboardPipelineWinRatesSection key={key} pipelineRates={pipelineRates} />;
      case 'timeline':
        return <DashboardTimelineSection key={key} timeline={timeline} />;
      case 'sources':
        return <DashboardSourcesSection key={key} sources={sources} />;
      case 'stages':
        return <DashboardStagesSection key={key} stages={stages} />;
      case 'user_performance':
        return <DashboardUserPerformanceSection key={key} userPerf={userPerf} />;
      default:
        return null;
    }
  };

  const sectionBlocks = useMemo(() => {
    const blocks = [];
    let i = 0;
    while (i < orderedVisible.length) {
      const current = orderedVisible[i].key;
      let paired = false;

      for (const [a, b] of PAIR_GRIDS) {
        const nextKey = orderedVisible[i + 1]?.key;
        if (
          (current === a && nextKey === b) ||
          (current === b && nextKey === a)
        ) {
          const keys = current === a ? [a, b] : [b, a];
          const gridClass = 'grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2';
          blocks.push(
            <div key={`pair-${keys.join('-')}`} className={gridClass}>
              {keys.map((k) => renderSection(k))}
            </div>
          );
          i += 2;
          paired = true;
          break;
        }
      }

      if (!paired) {
        blocks.push(renderSection(current));
        i += 1;
      }
    }
    return blocks;
  }, [
    orderedVisible,
    kpis,
    stages,
    sources,
    userPerf,
    timeline,
    pipelineRates,
    user,
    filtersMeta,
  ]);

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
      hour12: true,
    });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        <DashboardFilterBar
          greeting={greeting}
          displayName={displayName}
          isAdmin={isAdmin}
          filtersMeta={filtersMeta}
          filters={filters}
          setFilters={setFilters}
          handleFilterChange={handleFilterChange}
          pipelineOptions={pipelineOptions}
          stageOptions={stageOptions}
          stagesLoading={stagesLoading}
          showStageFilter={filters.pipeline !== 'all'}
          sourceOptions={sourceOptions}
          ownerOptions={ownerOptions}
          showOwnerFilter={showOwnerFilter}
          updatedLabel={updatedLabel}
        />

        {sectionBlocks}
      </div>
    </div>
  );
};

export default Dashboard;

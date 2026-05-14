import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/common/ui/Card';
import Button from '../components/common/ui/Button';
import Chip from '../components/common/ui/Chip';
import SearchableSelect from '../components/common/ui/SearchableSelect';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import {
  Users,
  Phone,
  IndianRupee,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  ExternalLink,
  Percent
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatLabel } from '../utils/helpers';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { API_ROUTES } from '../utils/apiRoutes';
import { fetchTeamAssignableUsers } from '../utils/fetchTeamAssignableUsers';
import { UiPageTitle, UiSectionTitle } from '../components/common/ui/Typography';
import { getChipVariant } from '../utils/chipConstants';

const PERIOD_OPTIONS = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: 'all', label: 'All' }
];

const SOURCE_COLORS = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#14b8a6', '#f43f5e'];

const STATUS_ORDER = ['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'];
const STATUS_CHART_COLORS = {
  new: '#0ea5e9',
  contacted: '#8b5cf6',
  interested: '#10b981',
  negotiation: '#f59e0b',
  converted: '#22c55e',
  lost: '#f43f5e'
};

const normalizeFilterKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const leadAgeDays = (lead, anchorMs) =>
  Math.floor((anchorMs - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

const filterLeadsBySourceOwner = (list, filters) =>
  list.filter((lead) => {
    const matchesSource =
      filters.source === 'all' ? true : normalizeFilterKey(lead.source) === normalizeFilterKey(filters.source);
    const matchesOwner = filters.owner === 'all' ? true : lead?.assignedTo?._id === filters.owner;
    return matchesSource && matchesOwner;
  });

const ChartTooltip = ({ active, payload, label, valueSuffix = '' }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-semibold text-slate-900">{label ?? row.name}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-slate-600">
          <span className="font-medium text-slate-800">{p.name || p.dataKey}:</span>{' '}
          {typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
          {valueSuffix}
        </p>
      ))}
    </div>
  );
};

const TeamPerformanceTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="mb-1 font-semibold text-slate-900">{point.name}</p>
      <p className="text-slate-600">Conversion rate: {point.conversionRate}%</p>
      <p className="text-slate-600">Total leads: {point.totalLeads}</p>
      <p className="text-slate-600">Converted: {point.converted}</p>
    </div>
  );
};

const StatTrend = ({ current, previous }) => {
  if (previous === undefined || previous === null) return null;
  if (current === 0 && previous === 0) {
    return <span className="text-xs font-medium text-slate-400">No prior period data</span>;
  }
  const diff = current - previous;
  const pct = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((diff / previous) * 100);
  const up = diff >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-semibold',
        up ? 'text-emerald-600' : 'text-rose-600'
      )}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(pct)}% <span className="font-normal text-slate-500">vs prior window</span>
    </span>
  );
};

const SkeletonBlock = ({ className }) => (
  <div className={cn('animate-pulse rounded-lg bg-slate-200/80', className)} />
);

const greetingForHour = (hour) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard = () => {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [filters, setFilters] = useState({
    period: '30',
    source: 'all',
    owner: 'all'
  });

  const fetchAllLeads = async (activeFilters) => {
    const limit = 100;
    let page = 1;
    let allLeads = [];
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await api.get(API_ROUTES.leads.list, {
        params: {
          page,
          limit,
          ...(activeFilters?.source && activeFilters.source !== 'all'
            ? { source: activeFilters.source }
            : {}),
          ...(activeFilters?.owner && activeFilters.owner !== 'all'
            ? { assignedTo: activeFilters.owner }
            : {})
        }
      });
      const leadsPage = response?.data?.leads || [];
      const pages = response?.data?.pagination?.pages || 1;
      allLeads = [...allLeads, ...leadsPage];
      totalPages = pages;
      page += 1;
    }

    return allLeads;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const loadData = async () => {
        setLoading(true);
        setError('');
        try {
          const [leadsData, teamRoster] = await Promise.all([
            fetchAllLeads(filters),
            admin ? fetchTeamAssignableUsers() : Promise.resolve([]),
          ]);

          setLeads(leadsData);
          setUsers(teamRoster || []);
          setCurrentTimestamp(Date.now());
        } catch (err) {
          setError(err?.message || 'Failed to load dashboard data');
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [admin, filters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const anchorMs = useMemo(
    () =>
      currentTimestamp ||
      (leads.length ? Math.max(...leads.map((lead) => new Date(lead.createdAt).getTime())) : Date.now()),
    [currentTimestamp, leads]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const age = leadAgeDays(lead, anchorMs);
      const withinPeriod =
        filters.period === 'all' ? true : age <= Number(filters.period);
      const matchesSource =
        filters.source === 'all'
          ? true
          : normalizeFilterKey(lead.source) === normalizeFilterKey(filters.source);
      const matchesOwner = filters.owner === 'all' ? true : lead?.assignedTo?._id === filters.owner;
      return withinPeriod && matchesSource && matchesOwner;
    });
  }, [filters, leads, anchorMs]);

  const previousWindowLeads = useMemo(() => {
    if (filters.period === 'all') return [];
    const p = Number(filters.period);
    return filterLeadsBySourceOwner(leads, filters).filter((lead) => {
      const age = leadAgeDays(lead, anchorMs);
      return age > p && age <= p * 2;
    });
  }, [filters, leads, anchorMs]);

  const prevCounts = useMemo(() => {
    const total = previousWindowLeads.length;
    const fresh = previousWindowLeads.filter((l) => l.status === 'new').length;
    const won = previousWindowLeads.filter((l) => l.status === 'converted').length;
    const rev = previousWindowLeads
      .filter((l) => l.status === 'converted')
      .reduce((s, l) => s + (l.dealValue || 0), 0);
    return { total, fresh, won, rev };
  }, [previousWindowLeads]);

  const stats = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const newLeads = filteredLeads.filter((lead) => lead.status === 'new').length;
    const convertedLeads = filteredLeads.filter((lead) => lead.status === 'converted').length;
    const revenue = filteredLeads
      .filter((lead) => lead.status === 'converted')
      .reduce((sum, lead) => sum + (lead.dealValue || 0), 0);
    const activePipeline = filteredLeads.filter(
      (lead) => lead.status !== 'converted' && lead.status !== 'lost'
    ).length;
    const winRate =
      totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;

    return [
      {
        key: 'total',
        title: 'Total leads',
        value: totalLeads.toLocaleString('en-IN'),
        icon: Users,
        accent: 'bg-sky-50 dark:bg-sky-900/20',
        iconWrap: 'bg-sky-100 text-sky-700 ring-sky-200/60',
        trend: { current: totalLeads, previous: prevCounts.total }
      },
      {
        key: 'new',
        title: 'New',
        value: newLeads.toLocaleString('en-IN'),
        icon: Phone,
        accent: 'bg-emerald-50 dark:bg-emerald-900/20',
        iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200/60',
        trend: { current: newLeads, previous: prevCounts.fresh }
      },
      {
        key: 'converted',
        title: 'Converted',
        value: convertedLeads.toLocaleString('en-IN'),
        icon: CheckCircle,
        accent: 'bg-violet-50 dark:bg-violet-900/20',
        iconWrap: 'bg-violet-100 text-violet-700 ring-violet-200/60',
        trend: { current: convertedLeads, previous: prevCounts.won }
      },
      {
        key: 'revenue',
        title: 'Revenue (won)',
        value: formatCurrency(revenue),
        icon: IndianRupee,
        accent: 'bg-amber-50 dark:bg-amber-900/20',
        iconWrap: 'bg-amber-100 text-amber-800 ring-amber-200/60',
        trend: { current: revenue, previous: prevCounts.rev }
      },
      {
        key: 'pipeline',
        title: 'Active pipeline',
        value: activePipeline.toLocaleString('en-IN'),
        subtitle: 'Excluding won & lost',
        icon: Activity,
        accent: 'bg-slate-100 dark:bg-slate-700/30',
        iconWrap: 'bg-slate-100 text-slate-700 ring-slate-200/60',
        trend: null
      },
      {
        key: 'winrate',
        title: 'Win rate',
        value: `${winRate}%`,
        subtitle: 'Converted ÷ total in view',
        icon: Percent,
        accent: 'bg-primary-50 dark:bg-primary-900/20',
        iconWrap: 'bg-primary-100 text-primary-800 ring-primary-200/60',
        trend: null
      }
    ];
  }, [filteredLeads, prevCounts]);

  const sourceChartData = useMemo(() => {
    const counts = filteredLeads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([source, count], index) => ({
      source,
      count,
      fill: SOURCE_COLORS[index % SOURCE_COLORS.length]
    }));
  }, [filteredLeads]);

  const statusChartData = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      count: filteredLeads.filter((lead) => lead.status === status).length,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      fill: STATUS_CHART_COLORS[status] || '#64748b'
    }));
  }, [filteredLeads]);

  const leadsTimeline = useMemo(() => {
    const chartSpan = filters.period === 'all' ? 90 : Number(filters.period);
    const scoped =
      filters.period === 'all'
        ? filterLeadsBySourceOwner(leads, filters).filter((l) => leadAgeDays(l, anchorMs) < chartSpan)
        : filteredLeads;

    const points = [];
    for (let offset = chartSpan - 1; offset >= 0; offset -= 1) {
      const day = new Date(anchorMs);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const start = day.getTime();
      const end = start + 86400000;
      const count = scoped.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= start && t < end;
      }).length;
      const label = day.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      points.push({ label, count });
    }
    return points;
  }, [anchorMs, filters.period, filters.source, filters.owner, filteredLeads, leads]);

  const recentLeads = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [filteredLeads]);

  const filterOptions = useMemo(() => {
    const sources = Array.from(new Set(leads.map((lead) => lead.source).filter(Boolean)));
    const owners = Array.from(
      new Map(
        leads
          .filter((lead) => lead?.assignedTo?._id)
          .map((lead) => [lead.assignedTo._id, lead.assignedTo.name || lead.assignedTo.email || 'Unknown'])
      ).entries()
    ).map(([id, name]) => ({ id, name }));
    return { sources, owners };
  }, [leads]);

  const teamPerformance = useMemo(() => {
    if (!admin) return [];

    const leadCountByUser = {};
    const convertedCountByUser = {};

    filteredLeads.forEach((lead) => {
      const userId = lead?.assignedTo?._id;
      if (!userId) return;
      const uid = String(userId);
      leadCountByUser[uid] = (leadCountByUser[uid] || 0) + 1;
      if (lead.status === 'converted') {
        convertedCountByUser[uid] = (convertedCountByUser[uid] || 0) + 1;
      }
    });

    return users
      .map((member) => {
        const uid = String(member._id);
        const leadsCount = leadCountByUser[uid] || 0;
        const convertedCount = convertedCountByUser[uid] || 0;
        const rate = leadsCount > 0 ? `${((convertedCount / leadsCount) * 100).toFixed(1)}%` : '0.0%';
        return {
          _id: uid,
          name: member.name,
          leads: leadsCount,
          converted: convertedCount,
          rate
        };
      })
      .sort((a, b) => b.leads - a.leads);
  }, [admin, users, filteredLeads]);

  const teamPerformanceLineData = useMemo(
    () =>
      teamPerformance.map((member) => ({
        name: member.name,
        totalLeads: member.leads,
        converted: member.converted,
        conversionRate: Number(member.rate.replace('%', '')) || 0
      })),
    [teamPerformance]
  );

  const hour = new Date().getHours();
  const greeting = greetingForHour(hour);
  const displayName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const lastUpdated =
    currentTimestamp &&
    new Date(currentTimestamp).toLocaleString('en-IN', {
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
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
            <div
              className=""
              aria-hidden
            />
            <div
              className=""
              aria-hidden
            />

            <div className="relative px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                  <div className="min-w-0 max-w-xl space-y-1.5">
                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-primary-600">
                      {greeting}, {displayName}
                    </p>
                    <UiPageTitle className="text-gray-900">Dashboard</UiPageTitle>
                    <p className="font-sans text-sm leading-relaxed text-slate-600">
                      {admin
                        ? 'Team-wide pipeline health, sources, and conversion signals in one place.'
                        : 'Your assigned leads, pipeline mix, and momentum at a glance.'}
                    </p>
                    {!loading && lastUpdated ? (
                      <p className="flex items-center gap-1.5 font-sans text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        Updated {lastUpdated}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0"
                    role="toolbar"
                    aria-label="Dashboard filters"
                  >
                    <div
                      className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5"
                      role="group"
                      aria-label="Date range"
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFilters((prev) => ({ ...prev, period: option.value }))}
                          className={cn(
                            'rounded-md px-2.5 py-1 font-sans text-xs font-semibold transition-colors',
                            filters.period === option.value
                              ? 'bg-white text-primary-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <SearchableSelect
                      name="source"
                      value={filters.source}
                      onChange={handleFilterChange}
                      className="min-w-[8.5rem] flex-1 sm:min-w-[9.5rem] sm:flex-none"
                      buttonClassName="h-8 border-slate-200 bg-white text-xs"
                      dropdownClassName="min-w-[220px]"
                      options={[
                        { value: 'all', label: 'All sources' },
                        ...filterOptions.sources.map((source) => ({
                          value: source,
                          label: formatLabel(source)
                        }))
                      ]}
                    />

                    {admin ? (
                      <SearchableSelect
                        name="owner"
                        value={filters.owner}
                        onChange={handleFilterChange}
                        className="min-w-[8.5rem] flex-1 sm:min-w-[10rem] sm:flex-none"
                        buttonClassName="h-8 border-slate-200 bg-white text-xs"
                        dropdownClassName="min-w-[240px]"
                        options={[
                          { value: 'all', label: 'All owners' },
                          ...filterOptions.owners.map((owner) => ({
                            value: owner.id,
                            label: owner.name
                          }))
                        ]}
                      />
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs"
                      onClick={() => setFilters({ period: '30', source: 'all', owner: 'all' })}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-sm">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-14 w-14 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-3 w-24" />
                      <SkeletonBlock className="h-8 w-36" />
                      <SkeletonBlock className="h-3 w-28" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm',
                        'transition-all duration-200 hover:border-primary-200/60 hover:shadow-md hover:shadow-primary-900/5'
                      )}
                    >
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-0 opacity-100',
                          stat.accent
                        )}
                        aria-hidden
                      />
                      <div className="relative flex items-start gap-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-2 ring-inset',
                            stat.iconWrap
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {stat.title}
                          </p>
                          <p className="mt-1 truncate font-sans text-2xl font-bold tracking-tight text-slate-900">
                            {stat.value}
                          </p>
                          {stat.subtitle ? (
                            <p className="mt-0.5 font-sans text-xs text-slate-500">{stat.subtitle}</p>
                          ) : null}
                          {stat.trend && filters.period !== 'all' ? (
                            <div className="mt-2">
                              <StatTrend
                                current={stat.trend.current}
                                previous={stat.trend.previous}
                              />
                            </div>
                          ) : stat.trend && filters.period === 'all' ? (
                            <p className="mt-2 font-sans text-xs text-slate-400">Trends available for 7D / 30D</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Card className="overflow-hidden rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5">
                <CardHeader className="border-slate-100 bg-white dark:bg-slate-800 py-5">
                  <div>
                    <UiSectionTitle>New leads over time</UiSectionTitle>
                    <p className="mt-1 font-sans text-xs text-slate-500">
                      {filters.period === 'all'
                        ? 'Daily volume for the most recent 90 days (same source / owner filters).'
                        : 'Daily new leads in the selected period.'}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pb-6 pt-2">
                  <div className="h-72 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={leadsTimeline} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="leadArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip valueSuffix=" leads" />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="New leads"
                          stroke="#2563eb"
                          strokeWidth={2}
                          fill="url(#leadArea)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5">
                  <CardHeader className="border-slate-100 bg-white dark:bg-slate-800">
                    <div>
                      <UiSectionTitle>Lead source mix</UiSectionTitle>
                      <p className="mt-1 font-sans text-xs text-slate-500">Share of volume by acquisition source.</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      {sourceChartData.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                          <p className="font-sans text-sm font-medium text-slate-600">No source data</p>
                          <p className="max-w-xs text-center font-sans text-xs text-slate-500">
                            Try widening filters or another time range.
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={sourceChartData}
                              dataKey="count"
                              nameKey="source"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              innerRadius={52}
                              paddingAngle={2}
                            >
                              {sourceChartData.map((entry) => (
                                <Cell key={entry.source} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const p = payload[0].payload;
                                return (
                                  <ChartTooltip
                                    active={active}
                                    payload={[{ name: formatLabel(p.source), value: p.count, dataKey: 'count' }]}
                                    label={formatLabel(p.source)}
                                  />
                                );
                              }}
                            />
                            <Legend
                              formatter={(value) => formatLabel(value)}
                              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5">
                  <CardHeader className="border-slate-100 bg-white dark:bg-slate-800">
                    <div>
                      <UiSectionTitle>Pipeline by status</UiSectionTitle>
                      <p className="mt-1 font-sans text-xs text-slate-500">Where leads sit in the funnel today.</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statusChartData}
                          layout="vertical"
                          margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={92}
                            tick={{ fontSize: 11, fill: '#475569' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip valueSuffix="" />} />
                          <Bar dataKey="count" name="Leads" radius={[0, 8, 8, 0]} barSize={18}>
                            {statusChartData.map((entry) => (
                              <Cell key={entry.status} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div
                className={cn(
                  'grid grid-cols-1 gap-6',
                  admin ? 'lg:grid-cols-5' : ''
                )}
              >
                <Card
                  className={cn(
                    'rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5',
                    admin ? 'lg:col-span-2' : ''
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between border-slate-100 bg-white dark:bg-slate-800">
                    <div>
                      <UiSectionTitle>Recent leads</UiSectionTitle>
                      <p className="mt-1 font-sans text-xs text-slate-500">Latest in your current view.</p>
                    </div>
                    <Link
                      to="/leads"
                      className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      View all
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentLeads.length === 0 ? (
                      <div className="px-6 py-10 text-center font-sans text-sm text-slate-500">No leads match filters.</div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {recentLeads.map((lead) => (
                          <li key={lead._id}>
                            <Link
                              to={`/leads/${lead._id}`}
                              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-sans text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {(lead.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-sans text-sm font-semibold text-slate-900">{lead.name || '—'}</p>
                                <p className="truncate font-sans text-xs text-slate-500">{formatLabel(lead.source)}</p>
                              </div>
                              <Chip label={lead.status} variant={getChipVariant('STATUS', lead.status)} size="sm" />
                              <span className="hidden shrink-0 font-sans text-[11px] text-slate-400 sm:inline">
                                {formatDate(lead.createdAt)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {admin ? (
                  <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 lg:col-span-3">
                    <CardHeader className="border-slate-100 bg-white dark:bg-slate-800">
                      <UiSectionTitle>Team conversion</UiSectionTitle>
                      <p className="mt-1 font-sans text-xs text-slate-500">
                        Win rate by assignee for the filtered pipeline.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="h-64 rounded-2xl border border-slate-100 bg-slate-50/50 p-2">
                        {teamPerformanceLineData.length === 0 ? (
                          <div className="flex h-full items-center justify-center font-sans text-sm text-slate-500">
                            No team performance data for this view.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={teamPerformanceLineData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" domain={[0, 100]} axisLine={false} tickLine={false} />
                              <Tooltip content={<TeamPerformanceTooltip />} />
                              <Bar
                                dataKey="conversionRate"
                                fill="#4f46e5"
                                radius={[8, 8, 0, 0]}
                                name="Conversion rate"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      {teamPerformance.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80">
                          <table className="w-full font-sans text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                                <th className="px-4 py-2.5">Member</th>
                                <th className="px-4 py-2.5 text-right">Leads</th>
                                <th className="px-4 py-2.5 text-right">Won</th>
                                <th className="px-4 py-2.5 text-right">Rate</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {teamPerformance.slice(0, 8).map((row) => (
                                <tr key={row._id} className="bg-white hover:bg-slate-50/60 dark:bg-slate-800 dark:hover:bg-slate-700">
                                  <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{row.leads}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{row.converted}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-primary-700">
                                    {row.rate}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

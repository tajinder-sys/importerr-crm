import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import Chip from '../components/common/Chip';
import SearchableSelect from '../components/common/SearchableSelect';
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
  Bar
} from 'recharts';
import { 
  Users, 
  Phone, 
  IndianRupee,
  CheckCircle
} from 'lucide-react';
import { formatCurrency, formatLabel } from '../utils/helpers';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { API_ROUTES } from '../utils/apiRoutes';
import { UiPageTitle, UiSectionTitle } from '../components/common/ui/Typography';

const PERIOD_OPTIONS = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: 'all', label: 'All' }
];

const SOURCE_COLORS = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#14b8a6', '#f43f5e'];
const normalizeFilterKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const TeamPerformanceTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-gray-900">{point.name}</p>
      <p className="text-gray-700">Conversion Rate: {point.conversionRate}%</p>
      <p className="text-gray-700">Total Leads: {point.totalLeads}</p>
      <p className="text-gray-700">Converted Leads: {point.converted}</p>
    </div>
  );
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
          const [leadsData, usersResponse] = await Promise.all([
            fetchAllLeads(filters),
            admin
              ? api.get(API_ROUTES.users.list, { params: { includeAdmin: 'false', limit: 200 } })
              : Promise.resolve(null)
          ]);

          setLeads(leadsData);
          setUsers(usersResponse?.data?.users || []);
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

  const filteredLeads = useMemo(() => {
    const anchorDate = currentTimestamp || (leads.length
      ? Math.max(...leads.map((lead) => new Date(lead.createdAt).getTime()))
      : 0);
    return leads.filter((lead) => {
      const leadAgeDays = Math.floor(
        (anchorDate - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const withinPeriod =
        filters.period === 'all' ? true : leadAgeDays <= Number(filters.period);
      const matchesSource =
        filters.source === 'all'
          ? true
          : normalizeFilterKey(lead.source) === normalizeFilterKey(filters.source);
      const matchesOwner = filters.owner === 'all' ? true : lead?.assignedTo?._id === filters.owner;
      return withinPeriod && matchesSource && matchesOwner;
    });
  }, [filters, leads, currentTimestamp]);

  const stats = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const newLeads = filteredLeads.filter((lead) => lead.status === 'new').length;
    const convertedLeads = filteredLeads.filter((lead) => lead.status === 'converted').length;
    const revenue = filteredLeads
      .filter((lead) => lead.status === 'converted')
      .reduce((sum, lead) => sum + (lead.dealValue || 0), 0);

    return [
      {
        title: 'Total Leads',
        value: totalLeads.toString(),
        icon: Users,
        color: 'bg-blue-100 text-blue-700'
      },
      {
        title: 'New Leads',
        value: newLeads.toString(),
        icon: Phone,
        color: 'bg-emerald-100 text-emerald-700'
      },
      {
        title: 'Converted',
        value: convertedLeads.toString(),
        icon: CheckCircle,
        color: 'bg-purple-100 text-purple-700'
      },
      {
        title: 'Revenue',
        value: formatCurrency(revenue),
        icon: IndianRupee,
        color: 'bg-amber-100 text-amber-700'
      }
    ];
  }, [filteredLeads]);

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
    const statuses = ['new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'];
    const counts = statuses.map((status) => ({
      status,
      count: filteredLeads.filter((lead) => lead.status === status).length
    }));
    return counts.map((item) => ({
      ...item,
      label: item.status.charAt(0).toUpperCase() + item.status.slice(1)
    }));
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
      leadCountByUser[userId] = (leadCountByUser[userId] || 0) + 1;
      if (lead.status === 'converted') {
        convertedCountByUser[userId] = (convertedCountByUser[userId] || 0) + 1;
      }
    });

    return users
      .filter((member) => member.role === 'team_member' || member.role === 'team_manager')
      .map((member) => {
        const leadsCount = leadCountByUser[member._id] || 0;
        const convertedCount = convertedCountByUser[member._id] || 0;
        const rate = leadsCount > 0 ? `${((convertedCount / leadsCount) * 100).toFixed(1)}%` : '0.0%';
        return {
          name: member.name,
          role: member.role,
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <UiPageTitle>Dashboard</UiPageTitle>
                <p className="mt-1 text-sm text-gray-500">
                  {admin
                    ? 'Track team-wide performance and lead pipeline health.'
                    : 'Track your assigned leads and conversion progress.'}
                </p>
              </div>

              <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 lg:w-auto">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, period: option.value }))}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        filters.period === option.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}

                  <SearchableSelect
                    name="source"
                    value={filters.source}
                    onChange={handleFilterChange}
                    className="min-w-[170px]"
                    buttonClassName="h-8 text-xs"
                    dropdownClassName="min-w-[220px]"
                    options={[
                      { value: 'all', label: 'All Sources' },
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
                      className="min-w-[190px]"
                      buttonClassName="h-8 text-xs"
                      dropdownClassName="min-w-[230px]"
                      options={[
                        { value: 'all', label: 'All Owners' },
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
                    className="h-8 px-3 text-xs"
                    onClick={() => setFilters({ period: '30', source: 'all', owner: 'all' })}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Loading dashboard data...
            </div>
          ) : null}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="rounded-2xl border-gray-200 shadow-sm transition hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 rounded-xl p-3 ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dt className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">{stat.title}</dt>
                        <dd className="mt-1 flex items-baseline">
                          <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                        </dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl border-gray-200 shadow-sm">
              <CardHeader className="border-gray-100">
                <div>
                  <UiSectionTitle>Lead Source Distribution</UiSectionTitle>
                  <p className="text-xs text-gray-500">How leads are distributed by source.</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  {sourceChartData.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-gray-500">No source data for selected filters.</p>
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
                          outerRadius={95}
                          innerRadius={45}
                          paddingAngle={3}
                        >
                          {sourceChartData.map((entry) => (
                            <Cell key={entry.source} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200 shadow-sm">
              <CardHeader className="border-gray-100">
                <div>
                  <UiSectionTitle>Pipeline by Status</UiSectionTitle>
                  <p className="text-xs text-gray-500">Current lead stage distribution.</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {admin && (
            <Card className="mb-8 w-full rounded-2xl border-gray-200 shadow-sm">
              <CardHeader className="border-gray-100">
                <UiSectionTitle>Team Performance</UiSectionTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Loading team performance...</p>
                ) : error ? null : (
                  <div className="space-y-4">
                    <div className="h-72 rounded-xl border border-gray-100 bg-gray-50 p-3">
                      {teamPerformanceLineData.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm text-gray-500">No team performance data available.</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={teamPerformanceLineData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                            <Tooltip content={<TeamPerformanceTooltip />} />
                            <Bar
                              dataKey="conversionRate"
                              fill="#2563eb"
                              radius={[6, 6, 0, 0]}
                              name="Conversion Rate"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

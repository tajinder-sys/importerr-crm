import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { USER_ROLES } from '../../utils/constants';
import { formatSlaRemaining } from '../../utils/formatSlaRemaining';
import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import { RecentListSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

function SlaRow({ item, showAssignee = false }) {
  const lead = item.lead;
  const leadId = lead?._id;
  const name = lead?.name || lead?.email || 'Lead';
  const timer = item.timer || {};
  const overdue = Boolean(timer.isOverdue) || (Number(timer.remainingSeconds) || 0) <= 0;

  if (!leadId) return null;

  return (
    <li>
      <Link
        to={`/leads/${leadId}`}
        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50"
      >
        {overdue ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
        ) : (
          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</p>
          {showAssignee && lead?.assignedTo?.name && (
            <p className="truncate text-xs text-slate-500">{lead.assignedTo.name}</p>
          )}
        </div>
        <span
          className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
            overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {formatSlaRemaining(timer.remainingSeconds)}
        </span>
      </Link>
    </li>
  );
}

function SlaList({ items, showAssignee, emptyMessage }) {
  if (!items.length) {
    return <p className="px-5 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
      {items.map((item) => {
        const id = item.lead?._id || item.progressId;
        return <SlaRow key={String(id)} item={item} showAssignee={showAssignee} />;
      })}
    </ul>
  );
}

/**
 * Dashboard SLA widgets:
 * - Team members & managers: API_ROUTES.leads.dueAssigned
 * - Team managers & admins: API_ROUTES.leads.overdueTeam
 */
export default function DashboardSlaAlertsSection({ user, filtersMeta }) {
  const role = user?.role;
  const userId = user?._id || user?.id;
  const teamId =
    user?.team_id?._id ||
    user?.team_id ||
    user?.teamId?._id ||
    user?.teamId;

  const isMember = role === USER_ROLES.TEAM_MEMBER;
  const isManager = role === USER_ROLES.TEAM_MANAGER;
  const isAdmin = role === USER_ROLES.ADMIN;

  const [due, setDue] = useState({ loading: true, error: '', items: [] });
  const [overdue, setOverdue] = useState({ loading: true, error: '', items: [] });
  console.log(due, "due", overdue, "overdue");
  const adminTeamIds = useMemo(() => {
    if (!isAdmin || teamId) return [];
    const pipelines = filtersMeta?.data?.pipelines || [];
    const ids = new Set();
    pipelines.forEach((p) => {
      const tid = p.teamId?._id || p.teamId;
      if (tid) ids.add(String(tid));
    });
    return [...ids];
  }, [isAdmin, teamId, filtersMeta?.data?.pipelines]);

  const showDue = Boolean(userId) && (isMember || isManager);
  const showOverdue =
    (isManager && Boolean(teamId)) || (isAdmin && (Boolean(teamId) || adminTeamIds.length > 0));

  useEffect(() => {
    if (!showDue || !userId) {
      setDue({ loading: false, error: '', items: [] });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setDue((s) => ({ ...s, loading: true, error: '' }));
      try {
        const res = await api.get(API_ROUTES.leads.dueAssigned(userId), {
          params: { withinSeconds: 86400 },
        });
        if (!cancelled) {
          setDue({ loading: false, error: '', items: res?.data?.leads || [] });
        }
      } catch (err) {
        if (!cancelled) {
          setDue({ loading: false, error: err?.message || 'Failed to load due leads', items: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDue, userId]);

  useEffect(() => {
    if (!showOverdue) {
      setOverdue({ loading: false, error: '', items: [] });
      return undefined;
    }

    const teamIdsToFetch = teamId ? [String(teamId)] : adminTeamIds;
    if (!teamIdsToFetch.length) {
      setOverdue({ loading: false, error: '', items: [] });
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setOverdue((s) => ({ ...s, loading: true, error: '' }));
      try {
        const results = await Promise.all(
          teamIdsToFetch.map((tid) => api.get(API_ROUTES.leads.overdueTeam(tid)))
        );
        const merged = [];
        const seen = new Set();
        for (const res of results) {
          for (const row of res?.data?.leads || []) {
            const lid = row.lead?._id ? String(row.lead._id) : String(row.progressId || '');
            if (!lid || seen.has(lid)) continue;
            seen.add(lid);
            merged.push(row);
          }
        }
        merged.sort((a, b) => (a.timer?.remainingSeconds ?? 0) - (b.timer?.remainingSeconds ?? 0));
        if (!cancelled) {
          setOverdue({ loading: false, error: '', items: merged });
        }
      } catch (err) {
        if (!cancelled) {
          setOverdue({
            loading: false,
            error: err?.message || 'Failed to load overdue leads',
            items: [],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showOverdue, teamId, adminTeamIds]);

  if (!showDue && !showOverdue) return null;

  return (
    <div className={`grid grid-cols-1 gap-6 ${showDue && showOverdue ? 'lg:grid-cols-2' : ''}`}>
      {showDue && (
        <Card className="overflow-hidden rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-slate-100 dark:border-slate-700">
            <div>
              <UiSectionTitle>Your SLA due soon</UiSectionTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Assigned leads due or overdue within 24 hours.
              </p>
            </div>
            <Link
              to="/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              Leads
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {due.loading ? (
              <RecentListSkeleton />
            ) : due.error ? (
              <div className="px-5 py-6">{sectionError(due.error)}</div>
            ) : (
              <SlaList
                items={due.items}
                showAssignee={false}
                emptyMessage="No assigned leads need attention in the next 24 hours."
              />
            )}
          </CardContent>
        </Card>
      )}

      {showOverdue && (
        <Card className="overflow-hidden rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-slate-100 dark:border-slate-700">
            <div>
              <UiSectionTitle>Team SLA overdue</UiSectionTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Active stage timers past deadline for your team&apos;s pipelines.
              </p>
            </div>
            <Link
              to="/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              Leads
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {overdue.loading ? (
              <RecentListSkeleton />
            ) : overdue.error ? (
              <div className="px-5 py-6">{sectionError(overdue.error)}</div>
            ) : (
              <SlaList
                items={overdue.items}
                showAssignee
                emptyMessage="No overdue SLA leads for this team."
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

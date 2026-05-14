import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import Chip from '../../components/common/ui/Chip';
import { ExternalLink } from 'lucide-react';
import { formatDate, formatLabel } from '../../utils/helpers';
import { RecentListSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardRecentLeadsSection({ recent }) {
  const leads = recent.data?.leads || [];

  return (
    <Card className="rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div>
          <UiSectionTitle>Recent leads</UiSectionTitle>
          <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">Latest in current filters.</p>
        </div>
        <Link
          to="/leads"
          className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
        >
          View all
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {recent.loading ? (
          <RecentListSkeleton />
        ) : recent.error ? (
          <div className="px-5 py-6">{sectionError(recent.error)}</div>
        ) : !leads.length ? (
          <div className="px-6 py-10 text-center font-sans text-sm text-slate-500">No leads match filters.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {leads.map((lead) => (
              <li key={lead._id}>
                <Link
                  to={`/leads/${lead._id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-sans text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {(lead.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {lead.name || '—'}
                    </p>
                    <p className="truncate font-sans text-xs text-slate-500">{formatLabel(lead.source)}</p>
                  </div>
                  <Chip
                    label={lead.stageId?.name || 'No stage'}
                    variant="neutral"
                    size="sm"
                    className="max-w-[120px] shrink-0 truncate"
                  />
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
  );
}

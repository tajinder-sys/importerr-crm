import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';
import { formatSlaRemaining } from '../../../utils/formatSlaRemaining';

/**
 * Compact banner on Leads page — uses API_ROUTES.leads.dueAssigned for the logged-in user.
 */
export default function LeadsSlaDueBanner({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(API_ROUTES.leads.dueAssigned(userId), {
          params: { withinSeconds: 86400 },
        });
        if (!cancelled) setItems(res?.data?.leads || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || !items.length) return null;

  const overdueCount = items.filter(
    (r) => r.timer?.isOverdue || (Number(r.timer?.remainingSeconds) || 0) <= 0
  ).length;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          {overdueCount > 0 ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {overdueCount > 0
                ? `${overdueCount} overdue · ${items.length - overdueCount} due soon`
                : `${items.length} lead${items.length === 1 ? '' : 's'} need SLA attention`}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Within the next 24 hours on your assigned leads.
            </p>
          </div>
        </div>
        <ul className="flex max-w-full flex-wrap gap-2">
          {items.slice(0, 5).map((row) => {
            const lead = row.lead;
            const overdue =
              row.timer?.isOverdue || (Number(row.timer?.remainingSeconds) || 0) <= 0;
            return (
              <li key={lead._id}>
                <Link
                  to={`/leads/${lead._id}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition hover:bg-white dark:hover:bg-slate-800 ${
                    overdue
                      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                      : 'border-amber-200 bg-white text-amber-900 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-100'
                  }`}
                >
                  <span className="max-w-[120px] truncate">{lead.name || lead.email}</span>
                  <span className="font-mono tabular-nums opacity-80">
                    {formatSlaRemaining(row.timer?.remainingSeconds)}
                  </span>
                </Link>
              </li>
            );
          })}
          {items.length > 5 && (
            <li className="self-center text-xs text-slate-500">+{items.length - 5} more</li>
          )}
        </ul>
      </div>
    </div>
  );
}

import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../common/ui/Card';
import Button from '../common/ui/Button';
import Chip from '../common/ui/Chip';
import { UiSectionTitle } from '../common/ui/Typography';
import { getChipVariant } from '../../utils/chipConstants';
import { formatDateIndian, formatLabel } from '../../utils/helpers';
import { resolveLeadRefName } from '../../utils/leadDisplay';
import { StageLabel } from './LeadQuickFacts';

const MATCH_FIELD_CONFIG = {
  email: { label: 'Email', valueKey: 'email' },
  phone: { label: 'Phone', valueKey: 'phone' },
  userId: { label: 'User ID', valueKey: 'userId' },
  productSku: { label: 'Product SKU', valueKey: 'productSku' },
};

function getMatchEntries(item) {
  return (item.matchReasons || [])
    .map((key) => {
      const config = MATCH_FIELD_CONFIG[key];
      if (!config) return null;
      const value = item[config.valueKey];
      if (value === undefined || value === null || String(value).trim() === '') return null;
      return { key, label: config.label, value: String(value).trim() };
    })
    .filter(Boolean);
}

function openLeadInNewTab(leadId) {
  window.open(`/leads/${leadId}`, '_blank', 'noopener,noreferrer');
}

function RelatedLeadsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

export default function RelatedLeadsPanel({ loading, related = [], matchFields = [] }) {
  const hasMatchers = matchFields.length > 0;

  return (
    <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm min-h-full dark:border-slate-700">
      <CardHeader className="border-gray-100 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <UiSectionTitle>Related leads</UiSectionTitle>
          {!loading && related.length > 0 && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {related.length} match{related.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>
        {!loading && hasMatchers && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Linked by{' '}
            {matchFields
              .map((f) => MATCH_FIELD_CONFIG[f]?.label || formatLabel(f))
              .join(', ')}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {loading && <RelatedLeadsSkeleton />}

        {!loading && !hasMatchers && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add email, phone, user ID, or product SKU on this lead to find related records.
          </p>
        )}

        {!loading && hasMatchers && related.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No other leads share this contact or product yet.
          </p>
        )}

        {!loading && related.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/80">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Lead
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Matching property
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Pipeline
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Stage
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Source
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Assigned
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Created
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-800">
                {related.map((item) => {
                  const matches = getMatchEntries(item);
                  return (
                    <tr
                      key={item._id}
                      className="transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20"
                    >
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.name || '—'}
                        </p>
                        {item.email && item.name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.email}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          {matches.map((m) => (
                            <div key={m.key} className="text-xs">
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                {m.label}:
                              </span>{' '}
                              <span className="font-mono text-slate-800 dark:text-slate-200">
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {resolveLeadRefName(item.pipelineId)}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                        <StageLabel stageRef={item.stageId} />
                      </td>
                      <td className="px-3 py-3">
                        {item.status ? (
                          <Chip
                            label={item.status}
                            variant={getChipVariant('STATUS', item.status)}
                          />
                        ) : (
                          '—'
                        )}
                        {item.isCompleted && (
                          <span className="ml-1 text-[10px] text-slate-500">(completed)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {item.source ? (
                          <Chip
                            label={item.source}
                            variant={getChipVariant('SOURCE', item.source)}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {item.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {formatDateIndian(item.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          startIcon={<ExternalLink className="h-3.5 w-3.5" />}
                          onClick={() => openLeadInNewTab(item._id)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

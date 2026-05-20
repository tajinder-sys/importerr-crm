import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { ROUTE_PATHS } from '../../routes/paths';
import PageHeader from '../../components/common/ui/PageHeader';
import Table from '../../components/common/ui/Table';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import Button from '../../components/common/ui/Button';
import Chip from '../../components/common/ui/Chip';
import { formatCurrency, formatDate, formatLabel } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

const STAGES = [
  { key: 'cart', label: 'Cart' },
  { key: 'payment', label: 'Payment' },
];

function StageTabs({ active, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {STAGES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            active === s.key
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

const AbandonedQueue = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('cart');
  const [minAgeMinutes, setMinAgeMinutes] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [processing, setProcessing] = useState(false);

  const fetchLeads = useCallback(
    async ({ page, limit }) => {
      const res = await api.get(API_ROUTES.abandonedLeads.list, {
        params: { stage, page, limit, status: 'open' },
      });
      setMinAgeMinutes(res?.data?.minAgeMinutes ?? 0);
      return {
        data: res?.data?.leads || [],
        total: res?.data?.total || 0,
      };
    },
    [stage, reloadKey]
  );

  const handleProcessNow = async () => {
    setProcessing(true);
    try {
      await api.post(API_ROUTES.settings.systemCronRun('abandoned_queue_lead'));
      setReloadKey((k) => k + 1);
    } finally {
      setProcessing(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Customer',
        render: (row) => (
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">{row.name || '—'}</p>
            <p className="text-xs text-slate-500">{row.email || '—'}</p>
            {row.phone ? <p className="text-xs text-slate-500">{row.phone}</p> : null}
          </div>
        ),
      },
      {
        key: 'cartValue',
        header: 'Cart value',
        render: (row) => formatCurrency(row.cartValue ?? 0),
      },
      {
        key: 'items',
        header: 'Items',
        render: (row) => {
          const count = Array.isArray(row.leadItems) ? row.leadItems.length : 0;
          const qty = (row.leadItems || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
          return (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {count} line{count === 1 ? '' : 's'} · {qty} qty
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Chip
            label={formatLabel(row.status || 'open')}
            variant={
              row.status === 'open' ? 'warning' : row.status === 'processed' ? 'success' : 'neutral'
            }
          />
        ),
      },
      {
        key: 'crmLeadId',
        header: 'CRM lead',
        render: (row) =>
          row.crmLeadId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/leads/${row.crmLeadId}`)}
            >
              View lead
            </Button>
          ) : (
            '—'
          ),
      },
      {
        key: 'updatedAt',
        header: 'Last activity',
        render: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {row.updatedAt ? formatDate(row.updatedAt) : '—'}
          </span>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Queues"
          description="Checkout abandonments synced from Importerr (cart and payment stages)."
        />
        <Link
          to={ROUTE_PATHS.ABANDONED_SETTINGS}
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Abandoned settings →
        </Link>
      </div>

      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 py-3">
          <StageTabs active={stage} onChange={setStage} />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Open {stage} leads older than {minAgeMinutes} minute{minAgeMinutes === 1 ? '' : 's'}
            </p>
            <Button
              size="sm"
              variant="outline"
              startIcon={<Play className="h-3.5 w-3.5" />}
              onClick={handleProcessNow}
              disabled={processing}
            >
              {processing ? 'Processing…' : 'Process now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <Table
            columns={columns}
            apiFunction={fetchLeads}
            queryParams={{ stage, reloadKey }}
            rowKey="_id"
            emptyMessage={`No abandoned ${stage} leads in the queue yet.`}
            defaultPageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AbandonedQueue;

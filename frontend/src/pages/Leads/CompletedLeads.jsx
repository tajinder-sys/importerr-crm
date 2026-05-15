import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import PageHeader from '../../components/common/ui/PageHeader';
import Table from '../../components/common/ui/Table';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import Chip from '../../components/common/ui/Chip';
import Button from '../../components/common/ui/Button';
import { formatDate, formatLabel } from '../../utils/helpers';
import { getChipVariant } from '../../utils/chipConstants';

const CompletedLeads = () => {
  const navigate = useNavigate();

  const fetchCompletedLeads = useCallback(async ({ page, limit, sortKey, sortDirection }) => {
    const res = await api.get(API_ROUTES.leads.list, {
      params: {
        page,
        limit,
        completedOnly: true,
        sortBy: sortKey || 'completedAt',
        sortOrder: sortDirection || 'desc',
      },
    });
    return {
      data: res?.data?.leads || [],
      total: res?.data?.pagination?.total || 0,
    };
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        sortable: true,
        header: 'Lead',
        render: (l) => <span className="font-semibold text-slate-800 dark:text-slate-100">{l.name}</span>,
      },
      {
        key: 'pipelineId',
        header: 'Pipeline',
        render: (l) => l?.pipelineId?.name || '—',
      },
      {
        key: 'stageId',
        header: 'Stage',
        render: (l) =>
          l?.stageId ? (
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: l.stageId.color || '#6b7280' }}
              />
              <span className="text-sm">{l.stageId.name}</span>
            </div>
          ) : (
            '—'
          ),
      },
      {
        key: 'assignedTo',
        header: 'Assigned to',
        render: (l) => l?.assignedTo?.name || '—',
      },
      {
        key: 'completedAt',
        sortable: true,
        header: 'Completed',
        render: (l) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {l.completedAt ? formatDate(l.completedAt) : '—'}
          </span>
        ),
      },
      {
        key: 'completedNote',
        header: 'Note',
        render: (l) => (
          <span
            className="line-clamp-2 max-w-xs text-sm text-slate-600 dark:text-slate-400"
            title={l.completedNote}
          >
            {l.completedNote || '—'}
          </span>
        ),
      },
      {
        key: 'source',
        header: 'Source',
        render: (l) => <Chip label={formatLabel(l.source)} variant={getChipVariant('SOURCE', l.source)} />,
      },
      {
        key: 'action',
        header: '',
        render: (l) => (
          <Button
            size="sm"
            variant="ghost"
            iconOnly
            startIcon={<Eye className="h-4 w-4" />}
            onClick={() => navigate(`/leads/${l._id}`)}
            title="View lead"
          />
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        <PageHeader
          title="Completed leads"
          description="Leads marked complete from the final pipeline stage. They are excluded from the active leads board and SLA overdue lists."
        />

        <Card className="rounded-3xl border-slate-200/90 shadow-md dark:border-slate-700 dark:bg-slate-800">
          <CardHeader className="border-slate-100 dark:border-slate-700">
            <UiSectionTitle>All completed</UiSectionTitle>
          </CardHeader>
          <CardContent>
            <Table
              columns={columns}
              apiFunction={fetchCompletedLeads}
              rowKey="_id"
              emptyMessage="No completed leads yet."
              defaultPageSize={10}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompletedLeads;

import { Card, CardHeader, CardContent } from '../../components/common/ui/Card';
import { UiSectionTitle } from '../../components/common/ui/Typography';
import Chip from '../../components/common/ui/Chip';
import { ListChecks } from 'lucide-react';
import { formatLabel } from '../../utils/helpers';
import { TasksSectionSkeleton } from './DashboardSkeletons';

function sectionError(msg) {
  return msg ? (
    <p className="rounded-lg border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      {msg}
    </p>
  ) : null;
}

export default function DashboardTasksSection({ tasksSum }) {
  const taskByStatus = tasksSum.data?.byStatus || {};
  const taskTotal = tasksSum.data?.total ?? 0;

  return (
    <Card className="overflow-hidden rounded-3xl border-slate-200/90 shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="border-slate-100 bg-white py-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <UiSectionTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-slate-500" />
              Tasks
            </UiSectionTitle>
            <p className="mt-1 font-sans text-xs text-slate-500 dark:text-slate-400">
              Scoped to your role; counts by task status.
            </p>
          </div>
          {!tasksSum.loading && !tasksSum.error ? (
            <span className="shrink-0 font-sans text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {taskTotal.toLocaleString('en-IN')} total
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {tasksSum.loading ? (
          <TasksSectionSkeleton />
        ) : tasksSum.error ? (
          sectionError(tasksSum.error)
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.keys(taskByStatus).length === 0 ? (
              <p className="font-sans text-sm text-slate-500">No tasks in this view.</p>
            ) : (
              Object.entries(taskByStatus).map(([status, count]) => (
                <Chip key={status} label={`${formatLabel(status)} · ${count}`} variant="neutral" size="sm" />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

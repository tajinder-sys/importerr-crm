import { Card, CardContent, CardHeader } from '../common/ui/Card';
import { formatDateIndian, formatLabel } from '../../utils/helpers';
import { UiSectionTitle } from '../common/ui/Typography';
import MetadataViewer from '../common/ui/MetadataViewer';

const formatMetadataValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const renderMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    return '-';
  }

  return (
    <div className="space-y-1">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="font-medium text-gray-700">{formatLabel(key)}:</span>{' '}
          <span className="text-gray-600 break-all">{formatMetadataValue(value)}</span>
        </div>
      ))}
    </div>
  );
};

const ActivityTab = ({ canViewHistory, sortedLeadActivities }) => {
  if (!canViewHistory) {
    return (
      <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm">
        <CardContent className="p-4 text-sm text-gray-500">
          Activity is visible only to admin and team manager.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm min-h-full">
      <CardHeader className="border-gray-100">
        <UiSectionTitle>Lead History</UiSectionTitle>
      </CardHeader>
      <CardContent>
        {sortedLeadActivities.length === 0 ? (
          <p className="text-sm text-gray-500">No history found for this lead.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">By</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-700 dark:bg-slate-800">
                {sortedLeadActivities.map((activity) => (
                  <tr key={activity._id}>
                    <td className="px-3 py-2 text-sm text-gray-700">{formatDateIndian(activity.createdAt)}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{formatLabel(activity.type)}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{activity.description}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">{activity?.performedBy?.name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      <MetadataViewer metadata={activity.metadata} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityTab;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { ROUTE_PATHS } from '../../routes/paths';
import PageHeader from '../../components/common/ui/PageHeader';
import {
  partitionAbandonedSettings,
  AbandonedReminderFlowSettings,
  AbandonedLeadAutomationSettings,
} from './abandonedSettingsPanels';

const AbandonedSettings = () => {
  const [settings, setSettings] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const { reminderFlow, leadAutomation } = useMemo(() => partitionAbandonedSettings(settings), [settings]);

  const loadSettings = useCallback(async () => {
    const res = await api.get(API_ROUTES.settings.abandonedQueue);
    setSettings(res?.data || []);
  }, []);

  const loadEmailTemplates = useCallback(async () => {
    const res = await api.get(API_ROUTES.templates.list, { params: { type: 'email' } });
    setEmailTemplates(Array.isArray(res?.data) ? res.data : []);
  }, []);

  useEffect(() => {
    loadSettings().catch(() => {});
    loadEmailTemplates().catch(() => {});
  }, [loadSettings, loadEmailTemplates, reloadKey]);

  const bumpReload = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Abandoned checkout settings"
          description="Reminder timing and templates, then lead automation. Scheduled job on/off and intervals are under Settings → Scheduled crons."
        />
        <Link
          to={ROUTE_PATHS.ABANDONED_QUEUE}
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Queues
        </Link>
      </div>

      <AbandonedReminderFlowSettings
        settings={reminderFlow}
        emailTemplates={emailTemplates}
        onSaved={bumpReload}
      />
      <AbandonedLeadAutomationSettings settings={leadAutomation} onSaved={bumpReload} />
    </div>
  );
};

export default AbandonedSettings;

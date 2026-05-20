import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Play, Save, Timer } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { ROUTE_PATHS } from '../../routes/paths';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import PageHeader from '../../components/common/ui/PageHeader';
import { Card, CardContent, CardHeader } from '../../components/common/ui/Card';
import Button from '../../components/common/ui/Button';
import Input from '../../components/common/ui/Input';
import ToggleSwitch from '../../components/common/ui/ToggleSwitch';
import Snackbar from '../../components/common/ui/Snackbar';
import Loading from '../../components/common/ui/Loading';

const formatSummary = (payload) => {
  if (!payload || typeof payload !== 'object') return 'Done';
  if (payload.skipped) {
    if (payload.reason === 'cron_disabled') return 'Skipped (job disabled or env override)';
    if (payload.reason === 'smtp_not_configured') return 'Skipped (SMTP not configured)';
    return `Skipped (${payload.reason || 'unknown'})`;
  }
  if (typeof payload.sent === 'number') {
    return `Sent ${payload.sent}, failed ${payload.failed ?? 0}, scanned ${payload.scanned ?? 0}`;
  }
  if (typeof payload.scanned === 'number') {
    return `Scanned ${payload.scanned}, created ${payload.created ?? 0}, failed ${payload.failed ?? 0}`;
  }
  return 'Done';
};

const SystemCrons = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [jobs, setJobs] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.settings.systemCrons);
      const list = res?.data?.jobs || [];
      setJobs(list);
      const next = {};
      list.forEach((j) => {
        next[j.id] = {
          enabled: Boolean(j.enabled),
          intervalMinutes: String(j.intervalMinutes ?? ''),
        };
      });
      setDraft(next);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || 'Failed to load crons',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveJob = async (jobId) => {
    const d = draft[jobId];
    if (!d) return;
    setSavingId(jobId);
    try {
      const intervalMinutes = Number(d.intervalMinutes);
      await api.put(API_ROUTES.settings.systemCronUpdate(jobId), {
        enabled: d.enabled,
        intervalMinutes: Number.isFinite(intervalMinutes) ? intervalMinutes : undefined,
      });
      setSnackbar({ open: true, message: 'Cron settings saved', type: 'success' });
      await load();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || 'Save failed',
        type: 'error',
      });
    } finally {
      setSavingId(null);
    }
  };

  const runJob = async (jobId) => {
    setRunningId(jobId);
    try {
      const res = await api.post(API_ROUTES.settings.systemCronRun(jobId));
      const payload = res?.data;
      setSnackbar({ open: true, message: formatSummary(payload), type: 'success' });
      await load();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.message || 'Run failed',
        type: 'error',
      });
    } finally {
      setRunningId(null);
    }
  };

  if (!isAdmin) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={ROUTE_PATHS.SETTINGS_API_CONFIG}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>
          <PageHeader
            title="Scheduled crons"
            description="Enable jobs, set how often they run, or trigger a run manually. New jobs are added in backend code (cron registry + handlers)."
          />
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center gap-2 border-b border-slate-100 py-4 dark:border-slate-700">
          <Timer className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Jobs</span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loading />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {jobs.map((job) => {
                const d = draft[job.id] || { enabled: false, intervalMinutes: '15' };
                const dirty =
                  d.enabled !== job.enabled ||
                  String(d.intervalMinutes) !== String(job.intervalMinutes);
                return (
                  <div
                    key={job.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.label}</p>
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{job.description}</p>
                      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{job.id}</p>
                      {(job.envForcedOff || job.envForcedOn) && job.envKillKey ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Server env <code className="rounded bg-amber-50 px-1 dark:bg-amber-950/40">{job.envKillKey}</code>{' '}
                          is forcing this job {job.envForcedOff ? 'off' : 'on'} regardless of the toggle below.
                        </p>
                      ) : null}
                      {job.lastRunAt ? (
                        <p className="text-xs text-slate-500">
                          Last run: {new Date(job.lastRunAt).toLocaleString()}
                          {job.running ? ' (running…)' : ''}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">Last run: —</p>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-72">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Enabled</span>
                        <ToggleSwitch
                          checked={d.enabled}
                          onChange={(v) =>
                            setDraft((prev) => ({
                              ...prev,
                              [job.id]: { ...prev[job.id], enabled: v },
                            }))
                          }
                          disabled={job.envForcedOff || job.envForcedOn}
                        />
                      </div>
                      <Input
                        type="number"
                        label="Interval (minutes)"
                        min={job.minIntervalMinutes}
                        max={job.maxIntervalMinutes}
                        value={d.intervalMinutes}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [job.id]: { ...prev[job.id], intervalMinutes: e.target.value },
                          }))
                        }
                        helperText={`${job.minIntervalMinutes}–${job.maxIntervalMinutes} min`}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          startIcon={<Save className="h-3.5 w-3.5" />}
                          disabled={!dirty || savingId === job.id}
                          loading={savingId === job.id}
                          onClick={() => saveJob(job.id)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          startIcon={<Play className="h-3.5 w-3.5" />}
                          loading={runningId === job.id}
                          disabled={runningId === job.id}
                          onClick={() => runJob(job.id)}
                        >
                          Run now
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Master switch: set <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">CRM_CRON_SCHEDULER_ENABLED=false</code> on
        the server to stop all scheduled ticks. Per-job env overrides (e.g.{' '}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">ABANDONED_QUEUE_CRON_ENABLED</code>) still apply.
      </p>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default SystemCrons;

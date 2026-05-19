import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  RotateCcw,
  Save,
  Users,
  UserCog,
  Shield,
} from 'lucide-react';
import ToggleSwitch from '../../components/common/ui/ToggleSwitch';
import Button from '../../components/common/ui/Button';
import Loading from '../../components/common/ui/Loading';
import Snackbar from '../../components/common/ui/Snackbar';
import ConfirmDialog from '../../components/common/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { USER_ROLES } from '../../utils/constants';
import { cn } from '../../utils/helpers';
import { UiPageDescription, UiPageTitle } from '../../components/common/ui';

const CATEGORY_LABELS = {
  leads: 'Leads',
  tasks: 'Tasks',
  sla: 'SLA',
  team: 'Team',
  system: 'System',
};

const ROLE_COLUMNS = [
  { key: 'admin', label: 'Admin', icon: Shield },
  { key: 'team_manager', label: 'Manager', icon: UserCog },
  { key: 'team_member', label: 'Member', icon: Users },
];

const NotificationSettings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.notifications.policies);
      if (res?.success && Array.isArray(res.data?.policies)) {
        setPolicies(res.data.policies);
        setDirty(false);
      } else {
        setSnackbar({ open: true, message: 'Failed to load notification settings', type: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Failed to load', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of policies) {
      const cat = p.category || 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [policies]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const patchPolicy = (key, patch) => {
    setDirty(true);
    setPolicies((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...patch, roles: { ...p.roles, ...(patch.roles || {}) } } : p))
    );
  };

  const setRole = (key, roleKey, value) => {
    setDirty(true);
    setPolicies((prev) =>
      prev.map((p) =>
        p.key === key ? { ...p, roles: { ...p.roles, [roleKey]: value } } : p
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(API_ROUTES.notifications.policies, {
        policies: policies.map(({ key, enabled, roles }) => ({ key, enabled, roles })),
      });
      if (res?.success) {
        setPolicies(res.data?.policies || policies);
        setDirty(false);
        setSnackbar({ open: true, message: 'Notification settings saved', type: 'success' });
      } else {
        setSnackbar({ open: true, message: res?.message || 'Save failed', type: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.post(API_ROUTES.notifications.policiesReset);
      if (res?.success) {
        setPolicies(res.data?.policies || []);
        setDirty(false);
        setSnackbar({ open: true, message: 'Reset to defaults', type: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Reset failed', type: 'error' });
    } finally {
      setResetting(false);
      setResetConfirmOpen(false);
    }
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <Link
        to="/settings/api-config"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <UiPageTitle className="flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary-600" />
            Notification settings
          </UiPageTitle>
          <UiPageDescription className="mt-1 max-w-2xl">
            Control which notifications are active and which roles receive them. New notification
            types added in the system appear here automatically.
          </UiPageDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            startIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => setResetConfirmOpen(true)}
            disabled={resetting}
          >
            Reset defaults
          </Button>
          <Button
            size="sm"
            startIcon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={!dirty || saving}
            loading={saving}
          >
            Save changes
          </Button>
        </div>
      </div>

      {loading ? (
        <Loading label="Loading notification policies..." />
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, rows]) => (
            <section key={category}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 sm:grid">
                  <span>Notification</span>
                  <span className="w-16 text-center">On</span>
                  {ROLE_COLUMNS.map((col) => (
                    <span key={col.key} className="w-20 text-center">
                      {col.label}
                    </span>
                  ))}
                </div>
                {rows.map((p, idx) => (
                  <div
                    key={p.key}
                    className={cn(
                      'flex flex-col gap-3 border-b border-gray-100 px-4 py-4 last:border-0 dark:border-slate-700 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-2',
                      idx % 2 === 1 && 'bg-gray-50/50 dark:bg-slate-900/20'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{p.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{p.description}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-center sm:w-16">
                      <span className="text-xs text-gray-500 sm:hidden">Enabled</span>
                      <ToggleSwitch checked={p.enabled} onChange={(v) => patchPolicy(p.key, { enabled: v })} />
                    </div>
                    {ROLE_COLUMNS.map((col) => (
                      <div
                        key={col.key}
                        className="flex items-center justify-between sm:w-20 sm:justify-center"
                      >
                        <span className="text-xs text-gray-500 sm:hidden">{col.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(p.roles?.[col.key])}
                          disabled={!p.enabled}
                          onChange={(e) => setRole(p.key, col.key, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset notification settings?"
        message="All notification policies will revert to system defaults."
        confirmLabel="Reset"
        onConfirm={handleReset}
        onCancel={() => setResetConfirmOpen(false)}
        loading={resetting}
      />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </div>
  );
};

export default NotificationSettings;

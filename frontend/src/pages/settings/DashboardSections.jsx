import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  TrendingUp,
  CheckSquare,
  LineChart,
  PieChart,
  GitBranch,
  Users,
  Award,
  Sparkles,
  ArrowLeft,
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

const SECTION_META = {
  kpis: { icon: BarChart3, accent: 'from-violet-500 to-purple-600', ring: 'ring-violet-500/20' },
  sla_alerts: { icon: Clock, accent: 'from-amber-500 to-orange-600', ring: 'ring-amber-500/20' },
  pipeline_win_rates: { icon: TrendingUp, accent: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-500/20' },
  tasks: { icon: CheckSquare, accent: 'from-sky-500 to-blue-600', ring: 'ring-sky-500/20' },
  timeline: { icon: LineChart, accent: 'from-indigo-500 to-blue-600', ring: 'ring-indigo-500/20' },
  sources: { icon: PieChart, accent: 'from-pink-500 to-rose-600', ring: 'ring-pink-500/20' },
  stages: { icon: GitBranch, accent: 'from-cyan-500 to-teal-600', ring: 'ring-cyan-500/20' },
  recent_leads: { icon: Users, accent: 'from-primary-500 to-primary-700', ring: 'ring-primary-500/20' },
  user_performance: { icon: Award, accent: 'from-fuchsia-500 to-purple-600', ring: 'ring-fuchsia-500/20' },
};

const defaultMeta = {
  icon: LayoutDashboard,
  accent: 'from-slate-500 to-slate-600',
  ring: 'ring-slate-500/20',
};

const DashboardSections = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.dashboard.sections);
      if (res?.success && Array.isArray(res.data?.sections)) {
        setSections(res.data.sections);
        setDirty(false);
      } else {
        setSnackbar({ open: true, message: 'Failed to load dashboard sections', type: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Failed to load dashboard sections', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const sorted = useMemo(() => {
    return [...sections].sort((a, b) => a.order - b.order || String(a.key).localeCompare(String(b.key)));
  }, [sections]);

  const visibleCount = useMemo(() => sorted.filter((s) => s.visible).length, [sorted]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const setVisible = (key, visible) => {
    setDirty(true);
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, visible } : s)));
  };

  const setAllVisible = (visible) => {
    setDirty(true);
    setSections((prev) => prev.map((s) => ({ ...s, visible })));
  };

  const moveSection = (index, direction) => {
    setDirty(true);
    setSections((prev) => {
      const next = [...prev].sort((a, b) => a.order - b.order);
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index];
      const b = next[target];
      const orderA = a.order;
      const orderB = b.order;
      return prev.map((s) => {
        if (s.key === a.key) return { ...s, order: orderB };
        if (s.key === b.key) return { ...s, order: orderA };
        return s;
      });
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ordered = [...sections].sort((a, b) => a.order - b.order);
      const payload = ordered.map((s, idx) => ({
        key: s.key,
        visible: Boolean(s.visible),
        order: (idx + 1) * 10,
      }));
      const res = await api.put(API_ROUTES.dashboard.sections, { sections: payload });
      if (res?.success) {
        setSections(res.data?.sections || ordered);
        setDirty(false);
        setSnackbar({ open: true, message: 'Dashboard layout saved', type: 'success' });
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
      const res = await api.post(API_ROUTES.dashboard.sectionsReset);
      if (res?.success) {
        setSections(res.data?.sections || []);
        setDirty(false);
        setSnackbar({ open: true, message: 'Restored default dashboard layout', type: 'success' });
      } else {
        setSnackbar({ open: true, message: res?.message || 'Reset failed', type: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Reset failed', type: 'error' });
    } finally {
      setResetting(false);
      setResetConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <UiPageTitle>Dashboard Sections</UiPageTitle>
            <UiPageDescription>Manage dashboard sections and their visibility.</UiPageDescription>
          </div>
        </div>
        {loading ? (
          <Loading className="py-16" text="Loading sections…" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                The filter bar is always shown at the top of the dashboard.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => setAllVisible(true)}
                >
                  Show all
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  startIcon={<EyeOff className="h-3.5 w-3.5" />}
                  onClick={() => setAllVisible(false)}
                >
                  Hide all
                </Button>
              </div>
            </div>

            <ul className="space-y-3">
              {sorted.map((section, index) => {
                const meta = SECTION_META[section.key] || defaultMeta;
                const Icon = meta.icon;
                const isOn = Boolean(section.visible);

                return (
                  <li
                    key={section.key}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 dark:bg-slate-800/90',
                      isOn
                        ? 'border-slate-200 dark:border-slate-700'
                        : 'border-slate-200/80 opacity-75 dark:border-slate-700/80',
                      'hover:border-primary-200 hover:shadow-md dark:hover:border-primary-800/50'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 w-1 bg-gradient-to-b transition-opacity',
                        meta.accent,
                        isOn ? 'opacity-100' : 'opacity-30'
                      )}
                    />
                    <div className="flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums',
                            'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                          )}
                        >
                          {index + 1}
                        </span>
                        <div
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-4',
                            meta.accent,
                            meta.ring,
                            !isOn && 'grayscale opacity-60'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{section.label}</p>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                isOn
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                              )}
                            >
                              {isOn ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          {section.description ? (
                            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                              {section.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-3 sm:pl-4">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-900/50">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveSection(index, -1)}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <div className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-600" />
                          <button
                            type="button"
                            disabled={index === sorted.length - 1}
                            onClick={() => moveSection(index, 1)}
                            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                        <ToggleSwitch checked={isOn} onChange={(v) => setVisible(section.key, v)} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-slate-500 sm:text-left dark:text-slate-400">
                Reset restores all sections, order, and visibility to factory defaults.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  startIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={saving || resetting}
                >
                  Reset to default
                </Button>
                <Button
                  startIcon={<Save className="h-4 w-4" />}
                  onClick={handleSave}
                  disabled={saving || resetting || !dirty}
                  loading={saving}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => !resetting && setResetConfirmOpen(false)}
        onConfirm={handleReset}
        title="Reset dashboard layout?"
        message="This will restore every section to its default order and turn all sections back on. Your current unsaved changes will be lost."
        confirmText="Reset to default"
        cancelText="Cancel"
        type="warning"
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

export default DashboardSections;

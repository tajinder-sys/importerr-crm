import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Save,
  Sparkles,
  Link2,
  Mail,
  Store,
  RotateCcw,
  ArrowDown,
  Zap,
  Info,
} from 'lucide-react';
import Button from '../../components/common/ui/Button';
import Loading from '../../components/common/ui/Loading';
import Snackbar from '../../components/common/ui/Snackbar';
import ConfirmDialog from '../../components/common/ui/ConfirmDialog';
import { UiPageDescription, UiPageTitle } from '../../components/common/ui';
import { useAuth } from '../../hooks/useAuth';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { USER_ROLES } from '../../utils/constants';
import { cn } from '../../utils/helpers';

const DEFAULT_ORDER = [
  'connected_account',
  'previous_lead_history',
  'seller_assignment',
  'ai_fallback',
];

const STRATEGY_META = {
  connected_account: {
    icon: Link2,
    accent: 'from-violet-500 to-indigo-600',
    ring: 'ring-violet-500/25',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    step: 'Account',
  },
  previous_lead_history: {
    icon: Mail,
    accent: 'from-sky-500 to-blue-600',
    ring: 'ring-sky-500/25',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    step: 'History',
  },
  seller_assignment: {
    icon: Store,
    accent: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-500/25',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    step: 'Seller',
  },
  ai_fallback: {
    icon: Sparkles,
    accent: 'from-fuchsia-500 to-purple-600',
    ring: 'ring-fuchsia-500/25',
    badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200',
    step: 'AI',
  },
};

const defaultMeta = {
  icon: Zap,
  accent: 'from-slate-500 to-slate-600',
  ring: 'ring-slate-500/20',
  badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  step: 'Rule',
};

function StrategyRowContent({ strategy, index, isOverlay = false, dragHandleProps = null }) {
  const meta = STRATEGY_META[strategy.id] || defaultMeta;
  const Icon = meta.icon;
  const isFirst = index === 0;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 dark:bg-slate-800/95 sm:p-5',
        isOverlay
          ? 'border-primary-300 shadow-lg ring-2 ring-primary-400/30 dark:border-primary-600'
          : 'border-slate-200 hover:border-primary-200 hover:shadow-md dark:border-slate-700 dark:hover:border-primary-800/50',
        isFirst && !isOverlay && 'border-primary-200/80 dark:border-primary-800/40'
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1 bg-gradient-to-b', meta.accent)} />
      <div className="flex min-w-0 flex-1 items-start gap-3 pl-2">
        {dragHandleProps ? (
          <button
            type="button"
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400',
              'cursor-grab active:cursor-grabbing hover:border-slate-300 hover:bg-white hover:text-slate-600',
              'dark:border-slate-600 dark:bg-slate-900/50 dark:hover:text-slate-200'
            )}
            aria-label={`Drag to reorder ${strategy.label}`}
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-600">
            <GripVertical className="h-4 w-4 text-slate-300" />
          </span>
        )}
        <span
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
            isFirst
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          )}
        >
          {index + 1}
        </span>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-4',
            meta.accent,
            meta.ring
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{strategy.label}</p>
            {isFirst ? (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                Tried first
              </span>
            ) : null}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                meta.badge
              )}
            >
              {meta.step}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {strategy.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SortableStrategyRow({ strategy, index, isLast }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: strategy.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className={cn('relative list-none', isDragging && 'opacity-40')}>
      <StrategyRowContent
        strategy={strategy}
        index={index}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      {!isLast ? (
        <div className="flex justify-center py-1" aria-hidden>
          <div className="flex flex-col items-center text-slate-300 dark:text-slate-600">
            <span className="h-3 w-px bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500" />
            <ArrowDown className="h-4 w-4" />
            <span className="h-3 w-px bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-500" />
          </div>
        </div>
      ) : null}
    </li>
  );
}

const LeadAssignmentStrategySettings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.settings.leadAssignmentStrategies);
      const list = res?.data?.strategies || [];
      if (res?.success && Array.isArray(list) && list.length) {
        setStrategies(list);
        setDirty(false);
      } else {
        setSnackbar({ open: true, message: 'Failed to load strategy order', type: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Failed to load', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeStrategy = useMemo(
    () => strategies.find((s) => s.id === activeId),
    [strategies, activeId]
  );

  const activeIndex = useMemo(
    () => strategies.findIndex((s) => s.id === activeId),
    [strategies, activeId]
  );

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setDirty(true);
    setStrategies((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const persistOrder = async (order, successMessage) => {
    const res = await api.put(API_ROUTES.settings.leadAssignmentStrategies, { order });
    if (res?.success) {
      setStrategies(res.data?.strategies || strategies);
      setDirty(false);
      setSnackbar({ open: true, message: successMessage, type: 'success' });
      return true;
    }
    setSnackbar({ open: true, message: res?.message || 'Save failed', type: 'error' });
    return false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistOrder(
        strategies.map((s) => s.id),
        'Assignment strategy order saved'
      );
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const ok = await persistOrder(DEFAULT_ORDER, 'Restored default strategy order');
      if (ok) setResetConfirmOpen(false);
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Reset failed', type: 'error' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto max-w-full space-y-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <UiPageTitle>Lead assignment strategies</UiPageTitle>
            <UiPageDescription>Control which auto-assignment rules run first when a new lead arrives. The engine
                  stops at the first strategy that can assign the lead.</UiPageDescription>
          </div>
        </div>

        {!loading && strategies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {strategies.map((s, i) => {
              const meta = STRATEGY_META[s.id] || defaultMeta;
              const Icon = meta.icon;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                    i === 0
                      ? 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <span className="tabular-nums text-slate-400">{i + 1}.</span>
                  <Icon className="h-3 w-3 opacity-70" />
                  {meta.step}
                  {i < strategies.length - 1 ? (
                    <span className="ml-0.5 text-slate-300 dark:text-slate-500">→</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {loading ? (
          <Loading className="py-16" text="Loading strategies…" />
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 sm:p-6">
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Priority order — top to bottom
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={strategies.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-0">
                  {strategies.map((strategy, index) => (
                    <SortableStrategyRow
                      key={strategy.id}
                      strategy={strategy}
                      index={index}
                      isLast={index === strategies.length - 1}
                    />
                  ))}
                </ul>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
                {activeStrategy ? (
                  <div className="scale-[1.02]">
                    <StrategyRowContent
                      strategy={activeStrategy}
                      index={activeIndex >= 0 ? activeIndex : 0}
                      isOverlay
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-500 sm:text-left dark:text-slate-400">
            {dirty ? 'You have unsaved changes to the strategy order.' : 'Strategy order is saved.'}
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
              disabled={!dirty || saving || resetting}
              loading={saving}
            >
              Save order
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => !resetting && setResetConfirmOpen(false)}
        onConfirm={handleReset}
        title="Reset strategy order?"
        message="This restores the default order: Connected account → Previous lead → Seller mapping → AI fallback."
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

export default LeadAssignmentStrategySettings;

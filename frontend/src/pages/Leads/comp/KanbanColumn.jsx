import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import LeadCard from './LeadCard';
import {
  defaultKanbanListQuery,
  KANBAN_SORT_OPTIONS,
} from '../hooks/kanbanPaginationConstants';

const defQ = defaultKanbanListQuery;

const hasActiveListFilters = (q) => {
  const d = defQ();
  return (
    q.sortBy !== d.sortBy ||
    q.sortOrder !== d.sortOrder ||
    !!q.status ||
    !!q.source ||
    !!(q.search || '').trim()
  );
};

const KanbanColumn = ({
  stage,
  leads,
  totalCount,
  page,
  pageSize,
  loadingMore,
  listQuery,
  onUpdateListQuery,
  onPageChange,
  isLoading,
  onView,
  onEdit,
  onAddLead,
  onNotify,
  isAdmin,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage._id });
  const panelRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(listQuery.search || '');

  const q = listQuery || defQ();
  const filtersOn = hasActiveListFilters(q);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  const safePage = Math.min(page, totalPages);
  const busy = isLoading || loadingMore;
  const canPrev = safePage > 1 && !busy;
  const canNext = safePage < totalPages && !busy;
  const accent = stage.color || '#6366f1';

  useEffect(() => {
    if (!panelOpen) return;
    setSearchDraft(listQuery.search || '');
  }, [panelOpen, listQuery.search]);

  useEffect(() => {
    if (!panelOpen) return;
    const onDocDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [panelOpen]);

  const leadIds = leads.map((l) => l._id);

  const mergedScrollRef = useCallback(
    (node) => {
      setNodeRef(node);
    },
    [setNodeRef],
  );

  const resetFilters = () => {
    onUpdateListQuery(defQ());
    setSearchDraft('');
    setPanelOpen(false);
  };

  const applySearch = () => {
    onUpdateListQuery({ search: searchDraft.trim() });
  };

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div
        ref={panelRef}
        className="relative flex flex-col gap-1 px-3 py-2.5 rounded-t-xl border-t-[3px] border-x border-slate-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700"
        style={{ borderTopColor: stage.color || '#6366f1' }}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
              style={{ backgroundColor: stage.color || '#6366f1' }}
            />
            <span className="text-xs font-bold text-slate-800 truncate">{stage.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => onAddLead(stage.pipelineId._id, stage._id)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              title="Add lead to this stage"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="relative w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="Sort & filter this column"
            >
              <SlidersHorizontal size={13} />
              {filtersOn && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-slate-600">
            Total: <span className="text-slate-900 tabular-nums">{totalCount}</span>
          </p>

          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 shadow-sm ring-1 ring-black/[0.03]">
            {/* <div
              className="absolute left-0 right-0 top-0 h-0.5 opacity-90"
              style={{ backgroundColor: accent }}
              aria-hidden
            /> */}
            <div className="relative flex items-stretch gap-0.5" role="navigation" aria-label="Column pages">
            <button
              type="button"
              aria-label="Previous page"
              title="Previous page"
              disabled={!canPrev}
              onClick={() => onPageChange(safePage - 1)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:pointer-events-none disabled:opacity-25 active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
            </button>

            <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 py-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Page
              </span>
              <span className="text-xs font-bold tabular-nums leading-tight text-slate-800">
                <span style={{ color: accent }}>{safePage}</span>
                <span className="mx-0.5 font-semibold text-slate-300">/</span>
                <span>{totalPages}</span>
              </span>
            </div>

            <button
              type="button"
              aria-label="Next page"
              title="Next page"
              disabled={!canNext}
              onClick={() => onPageChange(safePage + 1)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:pointer-events-none disabled:opacity-25 active:scale-95"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
            </button>
            </div>
          </div>
        </div>

        {panelOpen && (
          <div className="absolute left-2 right-2 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sort</p>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={q.sortBy}
                onChange={(e) => onUpdateListQuery({ sortBy: e.target.value })}
                className="text-[11px] rounded border border-slate-200 px-1.5 py-1 text-slate-700 bg-white"
              >
                {KANBAN_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={q.sortOrder}
                onChange={(e) => onUpdateListQuery({ sortOrder: e.target.value })}
                className="text-[11px] rounded border border-slate-200 px-1.5 py-1 text-slate-700 bg-white"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 pt-0.5">
              Filters
            </p>
            <div className="flex gap-1">
              <input
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
                placeholder="Search name, email…"
                className="min-w-0 flex-1 text-[11px] rounded border border-slate-200 px-1.5 py-1 text-slate-700"
              />
              <button
                type="button"
                onClick={applySearch}
                className="text-[11px] font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Go
              </button>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={resetFilters}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
              >
                Reset all
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        ref={mergedScrollRef}
        className={`flex-1 min-h-[60vh] max-h-[75vh] overflow-y-auto px-2 py-2 border-x border-b border-slate-200 rounded-b-xl space-y-2 transition-colors duration-150 scrollbar-thin dark:border-slate-700 ${
          isOver ? 'bg-indigo-50/70 border-indigo-300 dark:bg-indigo-900/20' : 'bg-slate-50/60 dark:bg-slate-900/60'
        }`}
      >
        {isLoading && (
          <div className="flex flex-col gap-2 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-3.5 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-slate-100 rounded w-full" />
                  <div className="h-2.5 bg-slate-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && leads.length === 0 && totalCount === 0 && (
          <div
            className={`flex flex-col items-center justify-center h-40 rounded-xl border border-dashed transition-colors duration-150 ${
              isOver ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'
            }`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${stage.color || '#6366f1'}15` }}
            >
              <Plus size={14} style={{ color: stage.color || '#6366f1' }} />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {filtersOn ? 'No matching leads' : 'No leads'}
            </p>
            {filtersOn ? (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-1.5 text-[11px] font-semibold hover:underline text-indigo-600"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAddLead(stage.pipelineId._id, stage._id)}
                className="mt-1.5 text-[11px] font-semibold hover:underline"
                style={{ color: stage.color || '#6366f1' }}
              >
                Add first lead
              </button>
            )}
          </div>
        )}

        {!isLoading && leads.length > 0 && (
          <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
            {leads.map((lead) => (
              <LeadCard
                key={lead._id}
                lead={lead}
                columnStage={stage}
                onView={onView}
                onEdit={onEdit}
                onNotify={onNotify}
                showAssigneeOnCollapsed={isAdmin}
              />
            ))}
          </SortableContext>
        )}

        {!isLoading && loadingMore && (
          <p className="text-center text-[11px] text-slate-400 py-2">Loading…</p>
        )}

        {isOver && leads.length > 0 && (
          <div
            className="h-1 rounded-full mx-2 opacity-50"
            style={{ backgroundColor: stage.color || '#6366f1' }}
          />
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;

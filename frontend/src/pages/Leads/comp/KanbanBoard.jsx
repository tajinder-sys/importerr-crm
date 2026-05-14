import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import LeadCard from './LeadCard';
import api from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';
import { defaultKanbanListQuery, KANBAN_PAGE_SIZE } from '../hooks/kanbanPaginationConstants';

const KanbanBoard = ({
  stages,
  leadsByStage,
  stageKanbanMeta,
  setLeadsByStage,
  setStageKanbanMeta,
  goToStagePage,
  updateStageListQuery,
  isLoading,
  onView,
  onEdit,
  onAddLead,
  onNotify,
  isAdmin,
}) => {
  const [activeLead, setActiveLead] = useState(null);

  const dragOriginStageId = useRef(null);
  const dragCurrentStageId = useRef(null);
  const dragDidCrossColumn = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const findStageOfLead = useCallback(
    (leadId) => {
      for (const [stageId, leads] of Object.entries(leadsByStage)) {
        if (leads.some((l) => l._id === leadId)) return stageId;
      }
      return null;
    },
    [leadsByStage],
  );

  const handleDragStart = ({ active }) => {
    const stageId = findStageOfLead(active.id);
    dragOriginStageId.current = stageId;
    dragCurrentStageId.current = stageId;
    dragDidCrossColumn.current = false;
    setActiveLead(leadsByStage[stageId]?.find((l) => l._id === active.id) || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    const fromStageId = dragCurrentStageId.current;
    if (!fromStageId) return;

    const toStageId = leadsByStage[over.id] !== undefined ? over.id : findStageOfLead(over.id);

    if (!toStageId || fromStageId === toStageId) return;

    dragCurrentStageId.current = toStageId;
    dragDidCrossColumn.current = true;

    setStageKanbanMeta((prev) => ({
      ...prev,
      [fromStageId]: {
        ...(prev[fromStageId] || {}),
        total: Math.max(0, (prev[fromStageId]?.total || 0) - 1),
      },
      [toStageId]: {
        ...(prev[toStageId] || {}),
        total: (prev[toStageId]?.total || 0) + 1,
      },
    }));

    setLeadsByStage((prev) => {
      const fromLeads = [...(prev[fromStageId] || [])];
      const toLeads = [...(prev[toStageId] || [])];
      const idx = fromLeads.findIndex((l) => l._id === active.id);
      if (idx === -1) return prev;
      const [moved] = fromLeads.splice(idx, 1);
      toLeads.unshift(moved);
      return { ...prev, [fromStageId]: fromLeads, [toStageId]: toLeads };
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveLead(null);

    const originStageId = dragOriginStageId.current;
    const currentStageId = dragCurrentStageId.current;
    const crossedColumn = dragDidCrossColumn.current;

    dragOriginStageId.current = null;
    dragCurrentStageId.current = null;
    dragDidCrossColumn.current = false;

    if (!over || !originStageId) return;

    if (!crossedColumn) {
      const leads = leadsByStage[originStageId] || [];
      const oldIdx = leads.findIndex((l) => l._id === active.id);
      const newIdx = leads.findIndex((l) => l._id === over.id);

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setLeadsByStage((prev) => ({
          ...prev,
          [originStageId]: arrayMove(prev[originStageId], oldIdx, newIdx),
        }));
      }
      return;
    }

    const toStageId = currentStageId;
    if (!toStageId || toStageId === originStageId) return;

    const leadId = active.id;

    try {
      const { success, message } = await api.put(API_ROUTES.leads.updateStage(leadId), {
        stageId: toStageId,
      });

      if (success) {
        onNotify(message);
      } else {
        onNotify(message, 'error');
      }

      setLeadsByStage((prev) => {
        const targetStage = stages.find((s) => String(s._id) === String(toStageId));
        return {
          ...prev,
          [toStageId]: (prev[toStageId] || []).map((l) =>
            l._id === leadId
              ? {
                  ...l,
                  stageId: targetStage
                    ? { ...targetStage }
                    : { ...(typeof l.stageId === 'object' ? l.stageId : {}), _id: toStageId },
                }
              : l,
          ),
        };
      });

    } catch (e) {
      console.error('handleDragEnd error:', e);
      onNotify(e?.message || 'Failed to move lead', 'error');

      setStageKanbanMeta((prev) => ({
        ...prev,
        [toStageId]: {
          ...(prev[toStageId] || {}),
          total: Math.max(0, (prev[toStageId]?.total || 0) - 1),
        },
        [originStageId]: {
          ...(prev[originStageId] || {}),
          total: (prev[originStageId]?.total || 0) + 1,
        },
      }));

      setLeadsByStage((prev) => {
        const toLeads = [...(prev[toStageId] || [])];
        const originLeads = [...(prev[originStageId] || [])];
        const idx = toLeads.findIndex((l) => l._id === leadId);
        if (idx === -1) return prev;
        const [moved] = toLeads.splice(idx, 1);
        originLeads.unshift(moved);
        return { ...prev, [toStageId]: toLeads, [originStageId]: originLeads };
      });
    }
  };

  const dragOverlayStage =
    activeLead != null
      ? stages.find((s) => String(s._id) === String(activeLead.stageId?._id || activeLead.stageId))
      : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto min-h-[80vh] items-start pb-2" style={{backgroundColor: 'var(--bg-primary)'}}>
        {stages.map((stage) => {
          const meta = stageKanbanMeta?.[stage._id] || {
            total: 0,
            page: 1,
            loadingMore: false,
            listQuery: defaultKanbanListQuery(),
          };
          return (
            <KanbanColumn
              key={stage._id}
              stage={stage}
              leads={leadsByStage[stage._id] || []}
              totalCount={meta.total}
              page={meta.page || 1}
              pageSize={KANBAN_PAGE_SIZE}
              loadingMore={meta.loadingMore}
              listQuery={meta.listQuery || defaultKanbanListQuery()}
              onUpdateListQuery={(patch) => updateStageListQuery(stage._id, patch)}
              onPageChange={(p) => goToStagePage(stage._id, p)}
              isLoading={isLoading}
              onView={onView}
              onEdit={onEdit}
              onAddLead={onAddLead}
              onNotify={onNotify}
              isAdmin={isAdmin}
            />
          );
        })}

        {!isLoading && stages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-32">
            <p className="text-slate-400 text-sm">No stages configured for this pipeline.</p>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {activeLead && (
          <div className="w-72 rotate-2 scale-105 opacity-95 pointer-events-none shadow-2xl">
            <LeadCard
              lead={activeLead}
              columnStage={dragOverlayStage}
              onEdit={() => {}}
              onNotify={onNotify}
              showAssigneeOnCollapsed={isAdmin}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;

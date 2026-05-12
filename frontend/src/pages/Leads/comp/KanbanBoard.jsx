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

const KanbanBoard = ({
  stages,
  leadsByStage,
  setLeadsByStage,
  isLoading,
  onView,
  onEdit,
  onAddLead,
  onNotify,
}) => {
  const [activeLead, setActiveLead] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const dragOriginStageId  = useRef(null); // where the card started — for rollback
  const dragCurrentStageId = useRef(null); // where the card is RIGHT NOW — updated each onDragOver
  const dragDidCrossColumn = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // must move 8px before drag starts → clicks always fire cleanly
      },
    }),
  );

  const findStageOfLead = useCallback((leadId) => {
    for (const [stageId, leads] of Object.entries(leadsByStage)) {
      if (leads.some((l) => l._id === leadId)) return stageId;
    }
    return null;
  }, [leadsByStage]);

  /* ── Drag start ─────────────────────────────────────────────── */
  const handleDragStart = ({ active }) => {
    const stageId = findStageOfLead(active.id);
    dragOriginStageId.current  = stageId;
    dragCurrentStageId.current = stageId; // initialise current to origin
    dragDidCrossColumn.current = false;
    setActiveLead(leadsByStage[stageId]?.find((l) => l._id === active.id) || null);
  };

  /* ── Drag over: optimistic cross-column move ─────────────────── */
  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    // Always read from the CURRENT position, not origin —
    // so A→B→C works as three clean sequential moves
    const fromStageId = dragCurrentStageId.current;
    if (!fromStageId) return;

    const toStageId = leadsByStage[over.id] !== undefined
      ? over.id
      : findStageOfLead(over.id);

    if (!toStageId || fromStageId === toStageId) return;

    // Update current position BEFORE mutating state
    dragCurrentStageId.current = toStageId;
    dragDidCrossColumn.current = true;

    setLeadsByStage((prev) => {
      const fromLeads = [...(prev[fromStageId] || [])];
      const toLeads   = [...(prev[toStageId]   || [])];
      const idx       = fromLeads.findIndex((l) => l._id === active.id);
      if (idx === -1) return prev;
      const [moved] = fromLeads.splice(idx, 1);
      toLeads.unshift(moved);
      return { ...prev, [fromStageId]: fromLeads, [toStageId]: toLeads };
    });
  };

  /* ── Drag end ────────────────────────────────────────────────── */
  const handleDragEnd = async ({ active, over }) => {
    setActiveLead(null);

    const originStageId  = dragOriginStageId.current;
    const currentStageId = dragCurrentStageId.current; // where it actually landed
    const crossedColumn  = dragDidCrossColumn.current;

    // Reset refs immediately
    dragOriginStageId.current  = null;
    dragCurrentStageId.current = null;
    dragDidCrossColumn.current = false;

    if (!over || !originStageId) return;

    /* ── Same column: local reorder only, no API call ──────────── */
    if (!crossedColumn) {
      const leads  = leadsByStage[originStageId] || [];
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

    /* ── Cross-column: use currentStageId — ground truth from refs ─
       Do NOT use findStageOfLead here; state updates are async and
       may not reflect the final column yet at this point.           */
    const toStageId = currentStageId;

    if (!toStageId || toStageId === originStageId) return;

    const leadId = active.id;
    setUpdatingId(leadId);

    try {
      await api.put(API_ROUTES.leads.updateStage(leadId), {
        stageId: toStageId,
      });

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
              : l
          ),
        };
      });

      onNotify('Lead moved successfully');
    } catch (e) {
      onNotify(e?.message || 'Failed to move lead', 'error');

      // Rollback: move card from its current column back to origin
      setLeadsByStage((prev) => {
        const toLeads     = [...(prev[toStageId]     || [])];
        const originLeads = [...(prev[originStageId] || [])];
        const idx = toLeads.findIndex((l) => l._id === leadId);
        if (idx === -1) return prev;
        const [moved] = toLeads.splice(idx, 1);
        originLeads.unshift(moved);
        return { ...prev, [toStageId]: toLeads, [originStageId]: originLeads };
      });
    } finally {
      setUpdatingId(null);
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
      <div className="flex gap-4 overflow-x-auto min-h-[80vh] items-start pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage._id}
            stage={stage}
            leads={leadsByStage[stage._id] || []}
            isLoading={isLoading}
            updatingLeadId={updatingId}
            onView={onView}
            onEdit={onEdit}
            onAddLead={onAddLead}
            onNotify={onNotify}
          />
        ))}

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
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
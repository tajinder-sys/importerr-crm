import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import LeadCard from './LeadCard';

const KanbanColumn = ({
  stage,
  leads,
  onView,
  onEdit,
  onAddLead,
  isLoading,
  onNotify,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage._id });
  const leadIds = leads.map((l) => l._id);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t-[3px] border-x border-slate-200 bg-white shadow-sm"
        style={{ borderTopColor: stage.color || '#6366f1' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: stage.color || '#6366f1' }}
          />
          <span className="text-xs font-bold text-slate-800 truncate">{stage.name}</span>
          <span
            className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `${stage.color || '#6366f1'}18`,
              color: stage.color || '#6366f1',
            }}
          >
            {leads.length}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onAddLead(stage.pipelineId._id, stage._id)}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            title="Add lead to this stage"
          >
            <Plus size={13} />
          </button>
          <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[60vh] max-h-[75vh] overflow-y-auto px-2 py-2 border-x border-b border-slate-200 rounded-b-xl space-y-2 transition-colors duration-150 scrollbar-thin ${
          isOver ? 'bg-indigo-50/70 border-indigo-300' : 'bg-slate-50/60'
        }`}
      >
        {/* Skeleton loading */}
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

        {/* Empty state */}
        {!isLoading && leads.length === 0 && (
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
            <p className="text-xs text-slate-400 font-medium">No leads</p>
            <button
              onClick={() => onAddLead(stage.pipelineId._id, stage._id)}
              className="mt-1.5 text-[11px] font-semibold hover:underline"
              style={{ color: stage.color || '#6366f1' }}
            >
              Add first lead
            </button>
          </div>
        )}

        {/* Lead cards */}
        {!isLoading && leads.length > 0 && (
          <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
            {leads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} onView={onView} onEdit={onEdit} onNotify={onNotify}/>
            ))}
          </SortableContext>
        )}

        {/* Drop indicator bar */}
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
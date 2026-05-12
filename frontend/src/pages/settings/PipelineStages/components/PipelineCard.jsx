import { Edit2, Plus, GitBranch, ChevronRight, Layers, Users } from 'lucide-react';
import { UiSectionTitle } from '../../../../components/common/ui';
import StageCard from './StageCard';

const PipelineCard = ({
  pipeline,
  stages,
  onEditPipeline,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onToggleStage,
}) => {
  const activeCount = stages.filter((s) => s.isActive).length;
  const inactiveCount = stages.length - activeCount;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">

      {/* Pipeline header band */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <GitBranch size={18} />
          </div>
          <div>
            <UiSectionTitle className="text-base font-bold text-slate-900">{pipeline.name}</UiSectionTitle>
            {pipeline.description && (
              <p className="text-xs text-slate-400 mt-0.5 max-w-md truncate">{pipeline.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats chips */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
              <Layers size={11} />
              {stages.length} stages
            </span>
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold">
                {activeCount} active
              </span>
            )}
            {inactiveCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium">
                {inactiveCount} inactive
              </span>
            )}
          </div>

          <button
            onClick={() => onEditPipeline(pipeline)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
            title="Edit pipeline"
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>

      {/* Stage flow visualization */}
      {stages.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap px-6 py-3 bg-slate-50 border-b border-slate-100 overflow-x-auto">
          {stages.map((stage, i) => (
            <div key={stage._id} className="flex items-center gap-1 flex-shrink-0">
              <span
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide transition-opacity ${
                  stage.isActive ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  backgroundColor: stage.isActive ? `${stage.color || '#6366f1'}18` : undefined,
                  color: stage.isActive ? (stage.color || '#6366f1') : '#94a3b8',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: stage.isActive ? `${stage.color || '#6366f1'}40` : '#e2e8f0',
                }}
              >
                {stage.name}
              </span>
              {i < stages.length - 1 && (
                <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stages list */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Stage Configuration</span>
          <button
            onClick={() => onAddStage(pipeline._id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors duration-150"
          >
            <Plus size={11} />
            Add Stage
          </button>
        </div>

        {stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Layers size={18} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">No stages configured</p>
            <p className="text-xs text-slate-400 mb-4 text-center max-w-xs">
              Add stages to define the steps in this pipeline
            </p>
            <button
              onClick={() => onAddStage(pipeline._id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={13} />
              Add First Stage
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {stages.map((stage, index) => (
              <StageCard
                key={stage._id}
                stage={stage}
                index={index}
                onEdit={onEditStage}
                onDelete={onDeleteStage}
                onToggle={onToggleStage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineCard;
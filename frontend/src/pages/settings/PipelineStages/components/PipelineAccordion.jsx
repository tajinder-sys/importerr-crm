import { useState } from 'react';
  import { ChevronRight, Edit2, Plus, GitBranch, Layers, Users, CheckCircle2, Circle, Star } from 'lucide-react';
import StageCard from './StageCard';

const StageFlowStrip = ({ stages }) => {
  if (!stages.length) return <span className="text-xs text-slate-400 italic dark:text-slate-500">No stages</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, i) => (
        <div key={stage._id} className="flex items-center gap-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold transition-opacity ${stage.isActive ? 'opacity-100' : 'opacity-35'}`}
            style={{
              backgroundColor: `${stage.color || '#6366f1'}18`,
              color: stage.isActive ? (stage.color || '#6366f1') : '#94a3b8',
              border: `1px solid ${stage.isActive ? `${stage.color || '#6366f1'}35` : '#334155'}`,
            }}
          >
            {stage.name}
          </span>
          {i < stages.length - 1 && <ChevronRight size={10} className="text-slate-300 flex-shrink-0 dark:text-slate-600" />}
        </div>
      ))}
    </div>
  );
};

const PipelineAccordion = ({
  pipeline, stages, teamName, defaultOpen = false,
  onEditPipeline, onPatchPipeline, onAddStage, onEditStage, onDeleteStage, onToggleStage,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const activeCount = stages.filter((s) => s.isActive).length;
  const inactiveCount = stages.length - activeCount;
  const pipelineActive = pipeline.isActive !== false;

  const pillToggle = (checked, onClick, title) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`}
      title={title}>
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className={`rounded-2xl shadow-sm border dark:bg-slate-800 ${
      isOpen
        ? 'border-indigo-200 shadow-md shadow-indigo-50 dark:border-indigo-700 dark:shadow-indigo-900/20'
        : 'border-slate-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:hover:border-slate-600'
    }`}>
      {/* Header */}
      <div className="flex items-stretch">
        <button type="button" onClick={() => setIsOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
          <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
            <ChevronRight size={16} />
          </div>
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
            isOpen ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'
          }`}>
            <GitBranch size={16} />
          </div>
          <div className="min-w-[140px] flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">{pipeline.name}</div>
              {pipeline.isDefault && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800">
                  <Star size={9} className="fill-amber-500 text-amber-600" />Default
                </span>
              )}
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                pipelineActive
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800'
                  : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600'
              }`}>
                {pipelineActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {teamName && (
              <div className="mt-0.5 flex items-center gap-1">
                <Users size={10} className="text-slate-400" />
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{teamName}</span>
              </div>
            )}
          </div>
          <div className="h-8 w-px flex-shrink-0 bg-slate-100 dark:bg-slate-700" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <StageFlowStrip stages={stages} />
          </div>
          <div className="ml-auto flex flex-shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
              <Layers size={11} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{stages.length}</span>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 dark:border-emerald-800 dark:bg-emerald-900/30">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
              </div>
            )}
            {inactiveCount > 0 && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">
                <Circle size={11} className="text-slate-300 dark:text-slate-600" />
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{inactiveCount}</span>
              </div>
            )}
          </div>
        </button>

        <div className="flex flex-col justify-center gap-2 border-l border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
          onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active</span>
            {pillToggle(pipelineActive, () => onPatchPipeline(pipeline._id, { isActive: !pipelineActive }), pipelineActive ? 'Deactivate' : 'Activate')}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Default</span>
            {pillToggle(!!pipeline.isDefault, () => onPatchPipeline(pipeline._id, { isDefault: !pipeline.isDefault }), pipeline.isDefault ? 'Unset default' : 'Set as default')}
          </div>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70 dark:bg-slate-800/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 dark:text-slate-500">
              <Layers size={11} />Stage Configuration
            </span>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); onEditPipeline(pipeline); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700">
                <Edit2 size={11} />Edit Pipeline
              </button>
              <button onClick={(e) => { e.stopPropagation(); onAddStage(pipeline._id); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all dark:text-indigo-400 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50">
                <Plus size={11} />Add Stage
              </button>
            </div>
          </div>
          <div className="px-5 py-3">
            {stages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2 dark:bg-slate-800">
                  <Layers size={16} />
                </div>
                <p className="text-sm font-medium text-slate-500 mb-0.5 dark:text-slate-400">No stages yet</p>
                <p className="text-xs text-slate-400 mb-3 dark:text-slate-500">Add stages to define this pipeline's flow</p>
                <button onClick={(e) => { e.stopPropagation(); onAddStage(pipeline._id); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">
                  <Plus size={12} />Add First Stage
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stages.map((stage, index) => (
                  <StageCard key={stage._id} stage={stage} index={index}
                    onEdit={onEditStage} onDelete={onDeleteStage} onToggle={onToggleStage} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineAccordion;

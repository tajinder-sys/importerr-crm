import { useState, Fragment } from 'react';
import {
  ChevronDown, ChevronRight, Edit2, Plus,
  GitBranch, Layers, Users, CheckCircle2, Circle
} from 'lucide-react';
import StageCard from './StageCard';

/* Inline stage flow strip shown in collapsed header */
const StageFlowStrip = ({ stages }) => {
  if (!stages.length) return <span className="text-xs text-slate-400 italic">No stages</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((stage, i) => (
        <div key={stage._id} className="flex items-center gap-1">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold transition-opacity ${
              stage.isActive ? 'opacity-100' : 'opacity-35'
            }`}
            style={{
              backgroundColor: `${stage.color || '#6366f1'}18`,
              color: stage.isActive ? (stage.color || '#6366f1') : '#94a3b8',
              border: `1px solid ${stage.isActive ? `${stage.color || '#6366f1'}35` : '#e2e8f0'}`,
            }}
          >
            {stage.name}
          </span>
          {i < stages.length - 1 && (
            <ChevronRight size={10} className="text-slate-300 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};
const PipelineTimeline = ({ stages }) => {
  return (
    <div className="flex items-center w-full py-4 px-2">
      {stages.map((stage, index) => (
        <Fragment key={stage._id}>
          {/* Stage node */}
          <div className="flex flex-col items-center gap-2 group relative">
            {/* Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold border-2 transition-all duration-150
                ${stage.isActive
                  ? 'bg-white group-hover:scale-110'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              style={stage.isActive ? {
                borderColor: stage.color,
                color: stage.color,
                boxShadow: `0 0 0 5px ${stage.color}22`,
              } : {}}
            >
              {index + 1}
            </div>

            {/* Label */}
            <span className={`text-xs whitespace-nowrap font-medium ${stage.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
              {stage.name}
            </span>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm pointer-events-none">
              <p className="font-medium text-slate-800 mb-0.5">{stage.name}</p>
              {stage.description ? <p>{stage.description}</p> : <p className="text-slate-400">No description</p>}
              {stage.probabilityPercent != null && (
                <p className="mt-1 text-slate-600">{stage.probabilityPercent}% win probability</p>
              )}
              {stage.followUpDays != null && (
                <p className="text-slate-600">Follow-up every {stage.followUpDays} day{stage.followUpDays === 1 ? '' : 's'}</p>
              )}
              <p className={`mt-1 font-medium ${stage.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                {stage.isActive ? '● Active' : '○ Inactive'}
              </p>
            </div>
          </div>

          {/* Connector line */}
          {index < stages.length - 1 && (
            <div
              className="flex-1 h-[1.5px] mx-1.5 relative -translate-y-[10px]"
              style={{ background: stage.isActive ? stage.color : '#e2e8f0' }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};
const PipelineAccordion = ({
  pipeline,
  stages,
  teamName,
  defaultOpen = false,
  onEditPipeline,
  onAddStage,
  onEditStage,
  onDeleteStage,
  onToggleStage,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const activeCount = stages.filter((s) => s.isActive).length;
  const inactiveCount = stages.length - activeCount;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 rounded-2xl border-gray-200 shadow-sm ${
        isOpen ? 'border-indigo-200 shadow-md shadow-indigo-50' : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* ── Accordion Header (always visible) ─────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Chevron */}
          <div
            className={`flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-90' : 'rotate-0'
            }`}
          >
            <ChevronRight size={16} />
          </div>

          {/* Pipeline icon */}
          <div
            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isOpen
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-indigo-50 text-indigo-500'
            }`}
          >
            <GitBranch size={16} />
          </div>

          {/* Pipeline name + team */}
          <div className="flex-shrink-0 min-w-[160px]">
            <div className="text-sm font-bold text-slate-900 leading-tight">{pipeline.name}</div>
            {teamName && (
              <div className="flex items-center gap-1 mt-0.5">
                <Users size={10} className="text-slate-400" />
                <span className="text-[11px] text-slate-400 font-medium">{teamName}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-slate-100 flex-shrink-0" />

          {/* Stage flow strip */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <StageFlowStrip stages={stages} />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
              <Layers size={11} className="text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500">{stages.length}</span>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-600">{activeCount}</span>
              </div>
            )}
            {inactiveCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100">
                <Circle size={11} className="text-slate-300" />
                <span className="text-[11px] font-semibold text-slate-400">{inactiveCount}</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* ── Accordion Body (stages) ────────────────────────── */}
      {isOpen && (
        <div className="border-t border-slate-100">
          {/* Subheader toolbar */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={11} />
              Stage Configuration
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onEditPipeline(pipeline); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all"
              >
                <Edit2 size={11} />
                Edit Pipeline
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAddStage(pipeline._id); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all"
              >
                <Plus size={11} />
                Add Stage
              </button>
            </div>
          </div>

          {/* Stage list */}
          <div className="px-5 py-3">
            {stages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Layers size={16} />
                </div>
                <p className="text-sm font-medium text-slate-500 mb-0.5">No stages yet</p>
                <p className="text-xs text-slate-400 mb-3">Add stages to define this pipeline's flow</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddStage(pipeline._id); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <Plus size={12} /> Add First Stage
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
      )}
    </div>
  );
};

export default PipelineAccordion;
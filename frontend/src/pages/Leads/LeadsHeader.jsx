import { UserPlus, LayoutGrid, GitBranch, Layers, CheckCircle2, KanbanSquare, Table2 } from 'lucide-react';

/**
 * LeadsHeader
 *
 * Props:
 *  pipelines        – Pipeline[]
 *  selectedPipeline – string (pipeline._id)
 *  onSelect         – (id) => void
 *  onCreateLead     – () => void
 *  view             – 'kanban' | 'table'
 *  onViewChange     – (view) => void
 */
const LeadsHeader = ({
  pipelines,
  selectedPipeline,
  onSelect,
  onCreateLead,
  view,
  onViewChange,
}) => {
  const current      = pipelines.find((p) => p._id === selectedPipeline);
  const totalStages  = current?.stages?.length || 0;
  const activeStages = current?.stages?.filter((s) => s.isActive).length || 0;

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm rounded-xl">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">

        {/* Left: icon + title + active pipeline meta */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
            <LayoutGrid size={16} />
          </div>

          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              Lead Management
            </h1>

            {current ? (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-semibold text-indigo-600">
                  {current.name}
                </span>

                {current.teamId?.name && (
                  <>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <span className="text-[11px] text-slate-400">{current.teamId.name}</span>
                  </>
                )}

                <span className="text-slate-300 text-[10px]">·</span>

                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Layers size={10} className="text-slate-400" />
                  {totalStages} stages
                </span>

                {activeStages > 0 && (
                  <>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 size={10} />
                      {activeStages} active
                    </span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">Select a pipeline to view leads</p>
            )}
          </div>
        </div>

        {/* Right: view toggle + create button */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* View toggle pill */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => onViewChange('kanban')}
              title="Kanban view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                view === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <KanbanSquare size={13} />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => onViewChange('table')}
              title="Table view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                view === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Table2 size={13} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Create lead */}
          <button
            onClick={onCreateLead}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all duration-150 hover:-translate-y-px active:translate-y-0"
          >
            <UserPlus size={13} />
            <span className="hidden sm:inline">Create Lead</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* ── Pipeline tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-none">
        {pipelines.map((pipeline) => {
          const isActive   = pipeline._id === selectedPipeline;
          const stageCount = pipeline.stages?.length || 0;

          return (
            <button
              key={pipeline._id}
              onClick={() => onSelect(pipeline._id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all duration-150 border-b-2 ${
                isActive
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <GitBranch size={11} className={isActive ? 'text-indigo-500' : 'text-slate-400'} />

              {pipeline.name}

              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {stageCount}
              </span>

            </button>
          );
        })}

        {pipelines.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-400 italic">No pipelines available</p>
        )}
      </div>

    </div>
  );
};

export default LeadsHeader;
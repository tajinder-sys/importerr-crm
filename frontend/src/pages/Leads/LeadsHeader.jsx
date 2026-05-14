import { UserPlus, LayoutGrid, GitBranch, Layers, CheckCircle2, KanbanSquare, Table2, User } from 'lucide-react';
import { Button, SearchableSelect, UiToolbarTitle } from '../../components/common/ui';
const selectBtn =
  'h-9 w-full rounded-lg border-slate-200/90 bg-white px-2.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100';

const LeadsHeader = ({
  pipelines,
  selectedPipeline,
  onSelect,
  onCreateLead,
  view,
  onViewChange,
  showAssigneeFilter = false,
  assignableMembers = [],
  assigneeFilter = '',
  onAssigneeFilterChange,
}) => {
  const current      = pipelines.find((p) => p._id === selectedPipeline);
  const totalStages  = current?.stages?.length || 0;
  const activeStages = current?.stages?.filter((s) => s.isActive).length || 0;

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm rounded-xl dark:bg-slate-800 dark:border-slate-700">

      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
            <LayoutGrid size={16} />
          </div>
          <div>
            <UiToolbarTitle>Lead Management</UiToolbarTitle>
            {current ? (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{current.name}</span>
                {current.teamId?.name && (
                  <>
                    <span className="text-slate-300 text-[10px] dark:text-slate-600">·</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{current.teamId.name}</span>
                  </>
                )}
                <span className="text-slate-300 text-[10px] dark:text-slate-600">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Layers size={10} className="text-slate-400" />
                  {totalStages} stages
                </span>
                {activeStages > 0 && (
                  <>
                    <span className="text-slate-300 text-[10px] dark:text-slate-600">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium dark:text-emerald-400">
                      <CheckCircle2 size={10} />
                      {activeStages} active
                    </span>
                  </>
                )}
              </div>
            ) : pipelines.length === 0 ? (
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                No active pipelines. Open Settings → Pipelines & stages to activate a pipeline.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5 dark:text-slate-500">Select a pipeline to view leads</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 dark:bg-slate-900">
            <button
              onClick={() => onViewChange('kanban')}
              title="Kanban view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                view === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
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
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Table2 size={13} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
          <Button
            size="sm"
            onClick={onCreateLead}
            startIcon={<UserPlus size={13} />}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all duration-150 hover:-translate-y-px active:translate-y-0"
          >
            <span className="hidden sm:inline">Create Lead</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

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
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
              }`}
            >
              <GitBranch size={11} className={isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
              {pipeline.name}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                isActive
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {stageCount}
              </span>
            </button>
          );
        })}
        {pipelines.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-400 italic dark:text-slate-500">No pipelines available</p>
        )}
      </div>

      {showAssigneeFilter && (
        <div className="flex flex-wrap items-center gap-3 px-6 py-2.5 border-t border-slate-100 bg-slate-50/90 dark:bg-slate-900/40 dark:border-slate-700">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <User size={14} className="flex-shrink-0 opacity-80" />
            <span className="text-xs font-semibold whitespace-nowrap">Assigned to</span>
          </div>
          <SearchableSelect
            name="assignee"
            value={assigneeFilter}
            onChange={(e) => onAssigneeFilterChange?.(e.target.value)}
            size="sm"
            buttonClassName={selectBtn}
            dropdownClassName="!min-w-[min(100vw-2rem,18rem)]"
            options={[{value: '', label: 'All assignees'}, ...assignableMembers.map((m) => (
              {value: String(m._id), label: m.name || m.email || m._id}
            ))]}
          />
        </div>
      )}
    </div>
  );
};

export default LeadsHeader;

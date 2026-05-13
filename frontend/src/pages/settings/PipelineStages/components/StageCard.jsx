import { Edit2, Trash2, GripVertical } from 'lucide-react';

const StageCard = ({ stage, index, onEdit, onDelete, onToggle }) => {
  return (
    <div className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 hover:shadow-sm ${
      stage.isActive
        ? 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600'
        : 'bg-slate-50/60 border-slate-100 opacity-60 dark:bg-slate-900/60 dark:border-slate-800'
    }`}>
      <GripVertical size={13} className="text-slate-300 flex-shrink-0 cursor-grab dark:text-slate-600" />

      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 border-2"
        style={{ borderColor: stage.color || '#6366f1', color: stage.color || '#6366f1' }}>
        {index + 1}
      </div>

      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#6366f1' }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800 truncate dark:text-slate-200">{stage.name}</span>
          {stage.description && (
            <span className="hidden sm:block text-xs text-slate-400 truncate max-w-xs dark:text-slate-500">{stage.description}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {stage.probabilityPercent != null && stage.probabilityPercent !== '' && (
            <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:ring-violet-800">
              {stage.probabilityPercent}% win
            </span>
          )}
          {stage.followUpDays != null && stage.followUpDays !== '' && (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800">
              Follow-up {stage.followUpDays}d
            </span>
          )}
        </div>
      </div>

      <span className={`flex-shrink-0 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${
        stage.isActive
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
      }`}>
        {stage.isActive ? 'ACTIVE' : 'OFF'}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
        <button onClick={() => onToggle(stage._id)}
          className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${stage.isActive ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`}
          title={stage.isActive ? 'Deactivate' : 'Activate'}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${stage.isActive ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
        <button onClick={() => onEdit(stage)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all dark:text-slate-500 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30">
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete('stage', stage._id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-900/30">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default StageCard;

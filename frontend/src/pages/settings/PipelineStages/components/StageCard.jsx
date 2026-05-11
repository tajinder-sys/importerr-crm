import { Edit2, Trash2, GripVertical } from 'lucide-react';

const StageCard = ({ stage, index, onEdit, onDelete, onToggle }) => {
  return (
    <div
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 hover:shadow-sm ${
        stage.isActive
          ? 'bg-white border-slate-200 hover:border-slate-300'
          : 'bg-slate-50/60 border-slate-100 opacity-60'
      }`}
    >
      <GripVertical size={13} className="text-slate-300 flex-shrink-0 cursor-grab" />

      {/* Order badge */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 border-2"
        style={{ borderColor: stage.color || '#6366f1', color: stage.color || '#6366f1' }}
      >
        {index + 1}
      </div>

      {/* Color dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color || '#6366f1' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">{stage.name}</span>
          {stage.description && (
            <span className="hidden sm:block text-xs text-slate-400 truncate max-w-xs">{stage.description}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`flex-shrink-0 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${
          stage.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        {stage.isActive ? 'ACTIVE' : 'OFF'}
      </span>

      {/* Actions — reveal on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
        <button
          onClick={() => onToggle(stage._id)}
          className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${
            stage.isActive ? 'bg-emerald-400' : 'bg-slate-300'
          }`}
          title={stage.isActive ? 'Deactivate' : 'Activate'}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${
              stage.isActive ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
        <button
          onClick={() => onEdit(stage)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete('stage', stage._id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default StageCard;
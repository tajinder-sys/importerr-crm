import { Search, X, SlidersHorizontal } from 'lucide-react';
import SelectField from '../../../components/common/ui/SelectField';
import Button from '../../../components/common/ui/Button';

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'qualified', 'won', 'lost'];
const SOURCE_OPTIONS = ['all', 'importerr_inquiry', 'direct', 'referral', 'social_media', 'cold_call'];

const KanbanToolbar = ({ filters, onFilterChange, onReset, totalLeads }) => {
  const hasActive = filters.search || filters.status !== 'all' || filters.source !== 'all';

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-100 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          placeholder="Search leads…"
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange('search', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Status filter */}
      <SelectField
        size="sm"
        wrapperClassName="w-auto min-w-[128px]"
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
        ))}
      </SelectField>

      {/* Source filter */}
      <SelectField
        size="sm"
        wrapperClassName="w-auto min-w-[128px]"
        value={filters.source}
        onChange={(e) => onFilterChange('source', e.target.value)}
      >
        {SOURCE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s === 'all' ? 'All Sources' : s.replace(/_/g, ' ')}</option>
        ))}
      </SelectField>

      {/* Reset */}
      {hasActive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
          startIcon={<X size={11} />}
          onClick={onReset}
        >
          Reset
        </Button>
      )}

      {/* Lead count */}
      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
        <SlidersHorizontal size={11} />
        <span><span className="font-semibold text-slate-600">{totalLeads}</span> leads</span>
      </div>
    </div>
  );
};

export default KanbanToolbar;
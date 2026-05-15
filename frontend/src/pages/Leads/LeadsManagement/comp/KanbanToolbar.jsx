import { Search, X, SlidersHorizontal } from 'lucide-react';
import SearchableSelect from '../../../../components/common/ui/SearchableSelect';
import Button from '../../../../components/common/ui/Button';

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'qualified', 'won', 'lost'];
const SOURCE_OPTIONS = ['all', 'importerr_inquiry', 'direct', 'referral', 'social_media', 'cold_call'];

const statusSelectOptions = STATUS_OPTIONS.map((s) => ({
  value: s,
  label: s === 'all' ? 'All Statuses' : s.replace(/_/g, ' '),
}));

const sourceSelectOptions = SOURCE_OPTIONS.map((s) => ({
  value: s,
  label: s === 'all' ? 'All Sources' : s.replace(/_/g, ' '),
}));

const KanbanToolbar = ({ filters, onFilterChange, onReset, totalLeads }) => {
  const hasActive = filters.search || filters.status !== 'all' || filters.source !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white px-6 py-3">
      {/* Search */}
      <div className="relative min-w-[180px] max-w-xs flex-1">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          placeholder="Search leads…"
          className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onFilterChange('search', '')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <SearchableSelect
        name="kanban-status"
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        options={statusSelectOptions}
        className="w-auto min-w-[128px] max-w-[200px]"
        buttonClassName="h-8 rounded-lg border-slate-200 px-2.5 text-xs"
      />

      <SearchableSelect
        name="kanban-source"
        value={filters.source}
        onChange={(e) => onFilterChange('source', e.target.value)}
        options={sourceSelectOptions}
        className="w-auto min-w-[128px] max-w-[200px]"
        buttonClassName="h-8 rounded-lg border-slate-200 px-2.5 text-xs"
      />

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

      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
        <SlidersHorizontal size={11} />
        <span>
          <span className="font-semibold text-slate-600">{totalLeads}</span> leads
        </span>
      </div>
    </div>
  );
};

export default KanbanToolbar;

import { Card, CardContent } from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import { formatLabel } from '../../utils/helpers';
import { RotateCcw } from 'lucide-react';

const STATUS_FILTER_OPTIONS = ['all', 'new', 'contacted', 'interested', 'negotiation', 'converted', 'lost'];
const SOURCE_FILTER_OPTIONS = ['all', 'importerr_inquiry', 'email', 'whatsapp', 'meta_ads', 'phone'];

const LeadFilters = ({
  filters,
  onFilterChange,
  onSearchChange,
  onSearchEnter,
  onReset,
  disabled = false
}) => (
  <Card className="rounded-xl border-gray-200 shadow-sm">
    <CardContent className="space-y-2 py-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_FILTER_OPTIONS.map((status) => {
                const active = filters.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={disabled}
                    onClick={() => onFilterChange('status', status)}
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {status === 'all' ? 'All Statuses' : formatLabel(status)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Source</p>
            <div className="flex gap-1 overflow-x-auto">
              {SOURCE_FILTER_OPTIONS.map((source) => {
                const active = filters.source === source;
                return (
                  <button
                    key={source}
                    type="button"
                    disabled={disabled}
                    onClick={() => onFilterChange('source', source)}
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {source === 'all' ? 'All Sources' : formatLabel(source)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:shrink-0">
          <div className="w-full lg:w-72">
            <Input
              name="search"
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSearchEnter();
                }
              }}
              placeholder="Search name/email/phone"
              className="h-8 py-1 text-xs"
              disabled={disabled}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            iconOnly
            onClick={onReset}
            disabled={disabled}
            className="h-8 w-8"
            title="Reset filters"
            aria-label="Reset filters"
            startIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            <span className="sr-only">Reset</span>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default LeadFilters;


import { Card, CardContent } from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import { formatLabel } from '../../utils/helpers';
import { RotateCcw } from 'lucide-react';

const ROLE_FILTER_OPTIONS = ['all', 'team_manager', 'team_member'];

const TeamFilters = ({
  filters,
  onFilterChange,
  onSearchChange,
  onSearchEnter,
  onReset,
  disabled = false,
  availableTeams = []
}) => (
  <Card className="rounded-xl border-gray-200 shadow-sm">
    <CardContent className="space-y-2 py-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Role</p>
            <div className="flex gap-1 overflow-x-auto">
              {ROLE_FILTER_OPTIONS.map((role) => {
                const active = filters.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={disabled}
                    onClick={() => onFilterChange('role', role)}
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {role === 'all' ? 'All Roles' : formatLabel(role)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Team</p>
            <div className="flex gap-1 overflow-x-auto">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFilterChange('team_id', 'all')}
                className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                  filters.team_id === 'all'
                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                All Teams
              </button>
              {availableTeams.map((team) => {
                const active = filters.team_id === team._id;
                return (
                  <button
                    key={team._id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onFilterChange('team_id', team._id)}
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                      active
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {team.name}
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

export default TeamFilters;


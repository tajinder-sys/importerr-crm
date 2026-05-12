import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader } from './Card';

const FilterPanel = ({
  title = 'Filters',
  isOpen,
  onToggle,
  onReset,
  children
}) => {
  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {title}
        </button>
      </div>

      {isOpen && (
        <Card className="rounded-2xl border-gray-200 shadow-sm">
          <CardHeader className="border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              {onReset ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      )}
    </>
  );
};

export default FilterPanel;

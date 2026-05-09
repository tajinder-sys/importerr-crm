import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/helpers';
import Skeleton from './Skeleton';
import SearchableSelect from './SearchableSelect';

const Table = ({
  columns = [],
  data = [],
  apiFunction = null,
  emptyMessage = 'No records found',
  rowKey = '_id',
  sortable = true,
  pagination = true,
  framed = true,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  queryParams = {}
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [serverData, setServerData] = useState([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const isServerMode = typeof apiFunction === 'function';

  useEffect(() => {
    if (!isServerMode) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiFunction({
          page,
          limit: pageSize,
          sortKey,
          sortDirection,
          ...queryParams
        });

        const items = response?.data || response?.items || response?.rows || [];
        const total =
          response?.total ??
          response?.pagination?.total ??
          response?.meta?.total ??
          items.length;

        setServerData(items);
        setServerTotal(total);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isServerMode, apiFunction, page, pageSize, sortKey, sortDirection, queryParams]);

  const sortedClientData = useMemo(() => {
    if (isServerMode) return serverData;
    if (!sortable || !sortKey) return data;

    const selectedColumn = columns.find((column) => column.key === sortKey);
    const accessor = selectedColumn?.sortAccessor;

    const getValue = (row) => {
      if (typeof accessor === 'function') return accessor(row);
      return row[sortKey];
    };

    return [...data].sort((a, b) => {
      const valueA = getValue(a);
      const valueB = getValue(b);

      if (valueA == null) return 1;
      if (valueB == null) return -1;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      const comparison = String(valueA).localeCompare(String(valueB), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [isServerMode, serverData, data, sortable, sortKey, sortDirection, columns]);

  const paginatedClientData = useMemo(() => {
    if (isServerMode || !pagination) return sortedClientData;
    const start = (page - 1) * pageSize;
    return sortedClientData.slice(start, start + pageSize);
  }, [isServerMode, pagination, sortedClientData, page, pageSize]);

  const totalRows = isServerMode ? serverTotal : sortedClientData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const rows = isServerMode ? serverData : paginatedClientData;

  const handleSort = (column) => {
    const canSort = sortable && column.sortable === true;
    if (!canSort) return;
    const nextSortKey = column.sortKey || column.key;
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  const renderSortIcon = (column) => {
    if (!sortable || column.sortable !== true) return null;
    const currentSortKey = column.sortKey || column.key;
    if (sortKey !== currentSortKey) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const goToPage = (nextPage) => {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
  };

  return (
    <div className="space-y-3">
      <div className={cn('overflow-x-auto', framed && 'rounded-xl border border-gray-200')}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 py-6 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
                    column.headerClassName
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      sortable && column.sortable === true ? 'hover:text-gray-700' : 'cursor-default'
                    )}
                  >
                    <span>{column.header}</span>
                    {renderSortIcon(column)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              Array.from({ length: Math.max(4, Math.min(pageSize, 8)) }).map((_, rowIndex) => (
                <tr key={`table-skeleton-row-${rowIndex}`}>
                  {columns.map((column, colIndex) => {
                    const widthClasses = ['w-20', 'w-28', 'w-24', 'w-32', 'w-16'];
                    const widthClass = widthClasses[colIndex % widthClasses.length];
                    const isActionColumn = String(column.key || '').toLowerCase() === 'action';
                    return (
                      <td
                        key={`table-skeleton-cell-${column.key}-${rowIndex}`}
                        className={cn('px-3 py-2.5', column.cellClassName)}
                      >
                        {isActionColumn ? (
                          <div className="flex items-center gap-1">
                            <Skeleton className="h-6 w-6 rounded-md" />
                            <Skeleton className="h-6 w-6 rounded-md" />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <Skeleton className={cn('h-3.5 rounded', widthClass)} />
                            {colIndex % 2 === 0 ? (
                              <Skeleton className={cn('h-2.5 w-12 rounded opacity-70')} />
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-gray-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={row[rowKey] || rowIndex}>
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-3 py-2 text-xs text-gray-700', column.cellClassName)}>
                      {column.render ? column.render(row, rowIndex) : row[column.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div
          className={cn(
            'flex flex-col gap-2 bg-white px-3 py-2 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between',
            framed ? 'rounded-lg border border-gray-200' : 'px-0'
          )}
        >
          <div>
            Showing <span className="font-medium text-gray-800">{rows.length}</span> of{' '}
            <span className="font-medium text-gray-800">{totalRows}</span>
          </div>
          <div className="flex items-center gap-2">
            <SearchableSelect
              name="pageSize"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="min-w-[88px]"
              buttonClassName="h-8 rounded-md text-sm"
              searchable={false}
              options={pageSizeOptions.map((option) => ({
                value: String(option),
                label: String(option)
              }))}
            />
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 p-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center font-medium text-gray-800">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 p-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;

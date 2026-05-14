import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn, formatLabel } from '../../../utils/helpers';

const SearchableSelect = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  searchable = true
}) => {
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const normalizedOptions = useMemo(
    () => options.map((option) => ({
      value: String(option.value),
      label: option.label || formatLabel(option.value)
    })),
    [options]
  );

  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => option.value === String(value)),
    [normalizedOptions, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return normalizedOptions;
    const search = query.trim().toLowerCase();
    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(search));
  }, [normalizedOptions, query]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open, searchable]);

  const handleOpen = () => {
    if (!open) setQuery('');
    setOpen((prev) => !prev);
  };

  const emitChange = (nextValue) => {
    if (typeof onChange === 'function') onChange({ target: { name, value: nextValue } });
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleOpen()}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm shadow-none transition-all',
          'border-gray-200 bg-white text-gray-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
          'hover:border-gray-300 dark:hover:border-slate-500',
          'focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10',
          open && 'border-violet-400 ring-2 ring-violet-400/10',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-slate-900 dark:disabled:text-slate-600',
          buttonClassName
        )}
      >
        <span className={cn('flex-1 truncate', !selectedOption && 'text-gray-400 dark:text-slate-500')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute z-20 mt-1 w-full overflow-hidden rounded-md border shadow-lg',
          'border-gray-200 bg-white shadow-gray-100/80 dark:border-slate-600 dark:bg-slate-800 dark:shadow-black/40',
          'animate-in fade-in-0 zoom-in-95 duration-100',
          dropdownClassName
        )}>
          {searchable && (
            <div className="border-b border-gray-100 p-1.5 dark:border-slate-700">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className={cn(
                    'h-7 w-full rounded pl-7 pr-2 text-xs',
                    'bg-gray-50 text-gray-800 placeholder:text-gray-400 border border-gray-200',
                    'dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 dark:border-slate-600',
                    'focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400/20'
                  )}
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-gray-400 dark:text-slate-500">No results found</p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(value) === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { emitChange(option.value); setOpen(false); }}
                    className={cn(
                      'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-violet-50 text-violet-700 font-medium dark:bg-violet-900/30 dark:text-violet-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

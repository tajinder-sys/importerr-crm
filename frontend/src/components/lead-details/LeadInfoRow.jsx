const LeadInfoRow = ({ label, value, right = false }) => (
  <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-100 py-1.5 last:border-b-0 dark:border-slate-700">
    <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
      {label}
    </span>
    <span
      className={`text-xs text-gray-800 dark:text-slate-200 ${right ? 'max-w-[70%] text-right' : 'min-w-0 text-right'}`}
    >
      {value ?? '—'}
    </span>
  </div>
);

export default LeadInfoRow;


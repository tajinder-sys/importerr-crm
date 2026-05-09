const SectionLabel = ({ children, count }) => (
  <div className="flex items-center gap-2 mb-2">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{children}</p>
    {count !== undefined && (
      <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </div>
);

export default SectionLabel;
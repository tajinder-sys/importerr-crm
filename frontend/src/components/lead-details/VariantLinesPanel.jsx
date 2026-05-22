import { useState } from 'react';
import { flattenLeadVariants, leadVariantQty, totalQtyFromLeadVariants } from '../../utils/leadVariants';

const getVariantKey = (v, idx) =>
  String(v?.sku ?? v?.skuId ?? v?.id ?? v?.label ?? `variant-${idx}`);

const getVariantImageUrl = (v) =>
  v?.imageUrl || v?.image || v?.imgUrl || v?.thumbnail || '';

export default function VariantLinesPanel({
  title,
  variants,
  defaultOpen = true,
  accent = 'slate',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = flattenLeadVariants(variants);
  const totalQty = totalQtyFromLeadVariants(variants);

  if (!rows.length) return null;

  const headerBg =
    accent === 'amber'
      ? 'bg-amber-50 dark:bg-amber-950/30'
      : accent === 'indigo'
        ? 'bg-indigo-50 dark:bg-indigo-950/30'
        : 'bg-gray-50 dark:bg-slate-700';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex justify-between items-center px-3.5 py-3 ${headerBg}`}
      >
        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">
          {title} ({rows.length})
          {totalQty > 0 ? (
            <span className="ml-2 font-normal text-gray-500">· {totalQty} pcs</span>
          ) : null}
        </span>
        <svg
          className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="divide-y max-h-64 overflow-y-auto dark:divide-slate-700">
          {rows.map((variant, idx) => (
            <div
              key={getVariantKey(variant, idx)}
              className="flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden border border-slate-100 bg-white shrink-0">
                  {getVariantImageUrl(variant) ? (
                    <img src={getVariantImageUrl(variant)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-300">—</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate dark:text-slate-200">
                    {variant.label || `SKU ${variant.skuId}`}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    SKU {variant.skuId ?? variant.sku}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 shrink-0">
                ×{leadVariantQty(variant)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

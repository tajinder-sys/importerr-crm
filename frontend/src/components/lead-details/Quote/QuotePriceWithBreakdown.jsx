import { useState } from 'react';
import { Eye, TrendingDown, TrendingUp, Package, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../../utils/helpers';
import Modal from '../../common/Modal';

const QuotePriceWithBreakdown = ({
  price,
  discountPercent,
  breakdown,
  originalBreakdown,
  showDiscount = true,
  totalQuantity = 1,
  initialUnitPrice,
}) => {
  const [open, setOpen] = useState(false);

  const perUnitPrice = totalQuantity > 0 ? price / totalQuantity : 0;
  const unitPriceChanged =
    initialUnitPrice && Math.abs(initialUnitPrice - perUnitPrice) > 0.01;
  const unitPriceSaved = unitPriceChanged ? initialUnitPrice - perUnitPrice : 0;
  const unitPriceDropPercent =
    initialUnitPrice && unitPriceChanged
      ? ((unitPriceSaved / initialUnitPrice) * 100).toFixed(2)
      : 0;

  const formatValue = (item, value) => {
    if (item?.key === 'lastMile')
      return `₹${value?.base} + ₹${value?.extraPer500g}/500g`;
    if (item?.type === 'percent') return `${(Number(value) * 100).toFixed(2)}%`;
    return value ?? '—';
  };

  const isDifferent = (a, b) => {
    if (typeof a === 'object') return JSON.stringify(a) !== JSON.stringify(b);
    return Number(a) !== Number(b);
  };

  const hasChanges = breakdown?.some((item) => {
    const original = originalBreakdown?.find((x) => x.key === item.key);
    return (
      original &&
      (isDifferent(original.value, item.value) || original.impact !== item.impact)
    );
  });

  const totalImpact = breakdown?.reduce((s, i) => s + (i.impact || 0), 0) ?? 0;
  const originalTotalImpact =
    originalBreakdown?.reduce((s, i) => s + (i.impact || 0), 0) ?? 0;
  const totalSaved = originalTotalImpact - totalImpact;

  const modalTitle = (
    <div className="flex items-center gap-3 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-slate-800">Cost breakdown</p>
        <p className="text-[11px] text-slate-400 mt-0.5 font-normal">
          {breakdown?.length ?? 0} factors
          {hasChanges && (
            <span className="ml-2 text-amber-600 font-medium">· modified</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {totalSaved > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-lg">
            <TrendingDown className="w-3 h-3" />
            {formatCurrency(totalSaved)} saved
          </div>
        )}
        {totalSaved < 0 && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">
            <TrendingUp className="w-3 h-3" />
            {formatCurrency(Math.abs(totalSaved))} added
          </div>
        )}
      </div>
    </div>
  );

  const modalFooter = (
    <div className="space-y-2.5">

      {/* ── Unit price comparison card ── */}
      {totalQuantity > 1 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <Package className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Per unit · {totalQuantity} items
            </span>
          </div>

          <div className="flex items-stretch divide-x divide-slate-100">

            {/* Initial unit price */}
            {unitPriceChanged && initialUnitPrice ? (
              <div className="flex-1 px-3 py-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                  Initial
                </p>
                <p className="text-sm font-semibold text-slate-400 line-through">
                  {formatCurrency(initialUnitPrice)}
                </p>
              </div>
            ) : null}

            {/* Arrow connector */}
            {unitPriceChanged && (
              <div className="flex items-center justify-center px-2 bg-slate-50">
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </div>
            )}

            {/* Current unit price */}
            <div className={`flex-1 px-3 py-2.5 ${unitPriceChanged ? 'bg-green-50/50' : ''}`}>
              <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                {unitPriceChanged ? 'Current' : 'Per unit'}
              </p>
              <p className={`text-sm font-bold leading-tight ${unitPriceChanged ? 'text-green-700' : 'text-indigo-700'}`}>
                {formatCurrency(perUnitPrice)}
              </p>
            </div>

            {/* Savings pill */}
            {unitPriceChanged && unitPriceSaved > 0 && (
              <div className="flex flex-col items-center justify-center px-3 py-2.5 bg-green-50 border-l border-green-100">
                <TrendingDown className="w-3 h-3 text-green-500 mb-0.5" />
                <p className="text-[10px] font-bold text-green-700 leading-tight">
                  {formatCurrency(unitPriceSaved)}
                </p>
                <p className="text-[9px] text-green-500 leading-tight">
                  −{unitPriceDropPercent}%
                </p>
              </div>
            )}

            {/* Price increase case */}
            {unitPriceChanged && unitPriceSaved < 0 && (
              <div className="flex flex-col items-center justify-center px-3 py-2.5 bg-red-50 border-l border-red-100">
                <TrendingUp className="w-3 h-3 text-red-400 mb-0.5" />
                <p className="text-[10px] font-bold text-red-600 leading-tight">
                  {formatCurrency(Math.abs(unitPriceSaved))}
                </p>
                <p className="text-[9px] text-red-400 leading-tight">
                  +{Math.abs(unitPriceDropPercent)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Total cost row ── */}
      <div className="grid grid-cols-[1fr_80px_100px] gap-2 items-center">
        <span className="text-xs font-semibold text-slate-600">Total cost</span>
        <div />
        <div className="text-right">
          {originalTotalImpact !== totalImpact && originalTotalImpact > 0 && (
            <p className="text-[10px] text-slate-400 line-through leading-tight">
              {formatCurrency(originalTotalImpact)}
            </p>
          )}
          <p className="text-sm font-bold text-slate-900">
            {formatCurrency(totalImpact)}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* ── Price display ── */}
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <p className="text-[22px] font-semibold text-slate-900 leading-tight">
            {formatCurrency(price)}
          </p>

          {/* Per unit line */}
          {totalQuantity > 1 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {unitPriceChanged && initialUnitPrice && (
                <>
                  <span className="text-[10px] text-slate-400 line-through">
                    {formatCurrency(initialUnitPrice)}
                  </span>
                  <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                </>
              )}
              <span className={`text-[11px] font-medium ${unitPriceChanged ? 'text-green-700' : 'text-slate-500'}`}>
                {formatCurrency(perUnitPrice)}
              </span>
              <span className="text-[10px] text-slate-400">
                / unit · {totalQuantity} items
              </span>
              {unitPriceChanged && unitPriceSaved > 0 && (
                <span className="text-[9px] font-semibold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                  −{unitPriceDropPercent}% / unit
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {showDiscount && discountPercent > 0 && (
            <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
              −{discountPercent}%
            </span>
          )}
          {breakdown?.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
            >
              <Eye size={10} />
              Breakdown
              {hasChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size="md"
        title={modalTitle}
        footer={modalFooter}
      >
        <div className="grid grid-cols-[1fr_80px_100px] gap-2 pb-2 mb-1 border-b border-slate-100">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Factor</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 text-right">Value</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 text-right">Impact</span>
        </div>

        <div className="divide-y divide-slate-50">
          {breakdown.map((item, i) => {
            const original = originalBreakdown?.find((x) => x.key === item.key);
            const valueChanged = original && isDifferent(original.value, item.value);
            const impactChanged = original && original.impact !== item.impact;
            const changed = valueChanged || impactChanged;
            const impactDiff = impactChanged ? item.impact - original.impact : 0;

            return (
              <div
                key={i}
                className={`grid grid-cols-[1fr_80px_100px] gap-2 items-center px-2 py-2.5 rounded-lg transition-colors ${
                  changed ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-slate-700 truncate">{item.label}</span>
                  {changed && (
                    <span className="shrink-0 text-[8px] font-semibold text-amber-700 bg-amber-100 px-1 py-0.5 rounded uppercase tracking-wide">
                      edited
                    </span>
                  )}
                </div>

                <div className="text-right">
                  {valueChanged ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 line-through leading-tight">
                        {formatValue(item, original?.value)}
                      </span>
                      <span className="text-[10px] font-medium text-amber-700 leading-tight">
                        {formatValue(item, item.value)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      {item.value !== undefined ? formatValue(item, item.value) : '—'}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  {impactChanged ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 line-through leading-tight">
                        {formatCurrency(original?.impact)}
                      </span>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-[10px] font-semibold text-slate-800 leading-tight">
                          {formatCurrency(item.impact)}
                        </span>
                        <span className={`text-[8px] font-medium leading-tight ${impactDiff < 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {impactDiff < 0 ? '↓' : '↑'}{formatCurrency(Math.abs(impactDiff))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-700">
                      {formatCurrency(item.impact)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default QuotePriceWithBreakdown;
import { TrendingDown, TrendingUp, Package } from 'lucide-react';
import { formatCurrency } from '../../../utils/helpers';

const ModalTitle = ({
  finalPrice = 0,
  initialFinalPrice = 0,
  initialUnitPrice = 0,
  currentUnitPrice = 0,
}) => {
  const current = Number(finalPrice ?? 0);
  const initial = Number(initialFinalPrice ?? 0);
  const isChanged = initial !== 0 && initial !== current;
  const diff = current - initial;
  const diffPercent = initial ? ((diff / initial) * 100).toFixed(2) : 0;
  const isCheaper = diff < 0;

  const unitChanged =
    initialUnitPrice > 0 &&
    Math.abs(initialUnitPrice - currentUnitPrice) > 0.01;
  const unitDiff = currentUnitPrice - initialUnitPrice;
  const unitDiffPercent = initialUnitPrice
    ? ((unitDiff / initialUnitPrice) * 100).toFixed(2)
    : 0;
  const unitIsCheaper = unitDiff < 0;

  return (
    <div className="flex items-center justify-between w-full gap-4 flex-wrap">

      {/* LEFT — title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-tight">Pricing breakdown</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Adjust inputs and recalculate</p>
        </div>
      </div>

      {/* RIGHT — prices */}
      <div className="flex items-stretch gap-3 shrink-0">

        {/* ── Unit price block — only when meaningful ── */}
        {currentUnitPrice > 0 && (
          <div className="flex flex-col justify-center text-right border-r border-slate-100 pr-3">
            <div className="flex items-center justify-end gap-1.5 mb-0.5">
              <Package className="w-2.5 h-2.5 text-slate-300" />
              <p className="text-[9px] uppercase tracking-widest text-slate-400">Per unit</p>
            </div>

            <div className="flex items-baseline gap-1.5 justify-end">
              {unitChanged && (
                <span className="text-[11px] text-slate-400 line-through font-normal">
                  {formatCurrency(initialUnitPrice)}
                </span>
              )}
              <span className={`text-sm font-bold tracking-tight ${
                unitChanged
                  ? unitIsCheaper ? 'text-green-700' : 'text-red-600'
                  : 'text-slate-700'
              }`}>
                {formatCurrency(currentUnitPrice)}
              </span>
            </div>

            {unitChanged && (
              <div className={`flex items-center justify-end gap-0.5 mt-0.5 text-[9px] font-medium ${
                unitIsCheaper ? 'text-green-600' : 'text-red-500'
              }`}>
                {unitIsCheaper
                  ? <TrendingDown className="w-2.5 h-2.5" />
                  : <TrendingUp className="w-2.5 h-2.5" />}
                {unitIsCheaper ? '' : '+'}{unitDiffPercent}% / unit
              </div>
            )}
          </div>
        )}

        {/* ── Total price block ── */}
        <div className="flex flex-col justify-center text-right">
          <div className="flex items-center justify-end gap-2 mb-0.5">
            <p className="text-[9px] uppercase tracking-widest text-slate-400">Final price</p>
            {isChanged && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${
                isCheaper
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {isCheaper
                  ? <TrendingDown className="w-2.5 h-2.5" />
                  : <TrendingUp className="w-2.5 h-2.5" />}
                {isCheaper ? '' : '+'}{diffPercent}%
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-2 justify-end">
            {isChanged && (
              <span className="text-sm text-slate-400 line-through font-normal">
                {formatCurrency(initial)}
              </span>
            )}
            <span className={`text-xl font-bold tracking-tight ${
              isChanged
                ? isCheaper ? 'text-green-700' : 'text-red-600'
                : 'text-slate-900'
            }`}>
              {formatCurrency(current)}
            </span>
          </div>

          {isChanged && (
            <p className={`text-[9px] font-medium mt-0.5 ${isCheaper ? 'text-green-600' : 'text-red-500'}`}>
              {isCheaper ? '−' : '+'}{formatCurrency(Math.abs(diff))} total
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default ModalTitle;
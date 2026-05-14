import {Box, Scale } from 'lucide-react';
import { formatCurrency } from '../../../utils/helpers';
import ImagePreview from './ImagePreview';
const DimsBadge = ({ length, width, height }) => (
  <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
    <Box className="w-2.5 h-2.5" />
    {length}×{width}×{height} cm
  </span>
);

const WeightBadge = ({ dw, volumetricWeight, chargeableType }) => {
  const weight = chargeableType === 'volumetric' ? volumetricWeight : dw;
  const label = chargeableType === 'volumetric' ? 'vol' : 'dead';
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded">
      <Scale className="w-2.5 h-2.5" />
      {Number(weight * 1000).toFixed(1)}g
      <span className="text-amber-400">·{label}</span>
    </span>
  );
};

const VariantRow = ({ v, sourceVariant, safeUnitPrice }) => {
  const totalPrice = safeUnitPrice * v.selectedQuantity;
    const formatInr = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num)
        ? `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
        : '—';
    };

    const formatRmb = (value) => {
    const num = Number(value || 0);
    return Number.isFinite(num) ? `¥ ${num.toFixed(2)}` : '—';
    };
  return (
    <div className="flex items-start justify-between bg-slate-50 px-2.5 py-2.5 rounded-lg gap-2">
      {/* Left: image + sku info */}
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-8 h-8 rounded-md border border-slate-100 bg-white overflow-hidden shrink-0 flex items-center justify-center mt-0.5">
          {sourceVariant?.imageUrl ? (
            <ImagePreview
                src={sourceVariant?.imageUrl}
                alt={v.skuId}
                className="w-8 h-8 rounded-md border border-slate-100"
                hoverPreview={true}
                previewSize={220}
              />
          ) : (
            <Box className="w-4 h-4 text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{v.skuId}</p>

          {/* Price line */}
          <p className="text-[10px] text-slate-400">
            {formatInr(safeUnitPrice)} × {v.selectedQuantity}
            <span className="mx-1 text-slate-300">·</span>
            {formatRmb(v.AP_RMB)}
          </p>

          {/* Dims + weight badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <DimsBadge length={v.length} width={v.width} height={v.height} />
            <WeightBadge dw={v.dw} volumetricWeight={v.volumetricWeight} chargeableType={v.chargeableType} />
            {!v.matchedCategory && (
              <span className="text-[9px] font-medium bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded">
                unmatched cat
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: prices */}
      <div className="text-right shrink-0 flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-slate-900">{formatCurrency(totalPrice)}</p>
        {/* <p className="text-[9px] text-slate-400">FBP {formatInr(v.FBP)}</p> */}
        {/* <p className="text-[9px] text-slate-400">CP {formatInr(v.CP)}</p> */}
      </div>
    </div>
  );
};

export default VariantRow;
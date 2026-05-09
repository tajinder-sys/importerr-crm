import { useState } from 'react';
import SectionLabel from './SectionLabel';
import { Pencil, Check, Loader2, RotateCcw, Package, ChevronDown, ChevronUp } from 'lucide-react';
import NumberInput from './NumberInput';
import ImagePreview from '../../common/ui/ImagePreview';

const VariantsSection = ({
  pricingVariantsDraft,
  leadVariants,
  onPricingVariantQtyChange,
  onPricingVariantFieldChange,
  initialVariants,
}) => {
  const [bulkDims, setBulkDims] = useState({ length: '', width: '', height: '', weight: '' });
  const [bulkApplied, setBulkApplied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!pricingVariantsDraft?.length) return null;

  const sourceVariants = Array.isArray(leadVariants)
    ? leadVariants
    : leadVariants?.variantLines || leadVariants?.variants || [];

  const applyToAll = () => {
    pricingVariantsDraft.forEach((_, i) => {
      if (bulkDims.length !== '') onPricingVariantFieldChange?.(i, 'length', Number(bulkDims.length));
      if (bulkDims.width !== '') onPricingVariantFieldChange?.(i, 'width', Number(bulkDims.width));
      if (bulkDims.height !== '') onPricingVariantFieldChange?.(i, 'height', Number(bulkDims.height));
      if (bulkDims.weight !== '') onPricingVariantFieldChange?.(i, 'weight', Number(bulkDims.weight));
    });
    setBulkApplied(true);
    setTimeout(() => setBulkApplied(false), 2000);
  };

  const resetAllVariants = () => {
    initialVariants?.forEach((variant, i) => {
      onPricingVariantFieldChange?.(i, 'length', variant.length);
      onPricingVariantFieldChange?.(i, 'width', variant.width);
      onPricingVariantFieldChange?.(i, 'height', variant.height);
      onPricingVariantFieldChange?.(i, 'weight', variant.dw);
      onPricingVariantQtyChange?.(i, variant.selectedQuantity);
    });
    setBulkDims({ length: '', width: '', height: '', weight: '' });
  };

  const setBulkField = (field, val) => setBulkDims((prev) => ({ ...prev, [field]: val }));
  const hasAnyBulkValue = Object.values(bulkDims).some((v) => v !== '');

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel count={pricingVariantsDraft.length}>Variants</SectionLabel>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition"
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!collapsed && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          {/* Bulk edit bar */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-50/60 to-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-600">Bulk edit dimensions</span>
                {!hasAnyBulkValue && (
                  <span className="text-[10px] text-slate-400">— fill any field to apply to all rows</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllVariants}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all
                </button>

                <button
                  onClick={applyToAll}
                  disabled={!hasAnyBulkValue}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                    bulkApplied
                      ? 'bg-green-500 text-white'
                      : hasAnyBulkValue
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {bulkApplied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Applied!
                    </>
                  ) : (
                    'Apply to all'
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Dimension inputs */}
              <div className="flex items-center gap-1">
                {[
                  { key: 'length', label: 'L' },
                  { key: 'width', label: 'W' },
                  { key: 'height', label: 'H' },
                ].map(({ key, label }) => (
                  <div key={key} className="relative">
                    <NumberInput
                      value={bulkDims[key]}
                      onChange={(e) => setBulkField(key, e.target.value)}
                      placeholder={label}
                      className="w-14 pl-4"
                    />
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 pointer-events-none">
                      {label}
                    </span>
                  </div>
                ))}
                <span className="text-[10px] text-slate-400 ml-1">cm</span>
              </div>

              <div className="h-5 w-px bg-slate-200" />

              {/* Weight input */}
              <div className="flex items-center gap-1">
                <div className="relative">
                  <NumberInput
                    value={bulkDims.weight}
                    onChange={(e) => setBulkField('weight', e.target.value)}
                    placeholder="Weight"
                    className="w-24 pl-4"
                  />
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 pointer-events-none">
                    W
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">g</span>
              </div>
            </div>
          </div>

          {/* Column headers */}
            <div className="grid grid-cols-[52px_1fr_90px_180px_100px] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
              {['Image', 'SKU', 'Qty', 'Dimensions', 'Weight'].map((h, i) => (
                <span
                  key={h}
                  className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${
                    i >= 2 ? 'text-center' : ''
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>

          {/* Rows */}
          {pricingVariantsDraft.map((variant, i) => (
            <div
              key={variant.skuId || i}
              className="grid grid-cols-[52px_1fr_90px_180px_100px] gap-2 items-center px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
            >
              {/* Image */}
              <div className="w-10 h-10 rounded-lg border border-slate-100 bg-white overflow-hidden flex items-center justify-center">
                  <ImagePreview
                      src={sourceVariants[i]?.imageUrl || ''}
                      alt={variant.skuId}
                      className="w-8 h-8 rounded-md border border-slate-100"
                      hoverPreview={true}
                      previewSize={220}
                    />
              </div>

              {/* SKU */}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {variant.skuId}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {variant.chargeableType}
                </p>
              </div>

              {/* Qty */}
              <div className="flex justify-center">
                <NumberInput
                  value={variant.selectedQuantity}
                  onChange={(e) =>
                    onPricingVariantQtyChange?.(i, Number(e.target.value))
                  }
                  min={1}
                  className="w-14"
                />
              </div>

              {/* Dimensions */}
              <div className="flex items-center justify-center gap-1">
                {['length', 'width', 'height'].map((field, fi) => (
                  <div key={field} className="relative">
                    <NumberInput
                      value={variant[field]}
                      onChange={(e) =>
                        onPricingVariantFieldChange?.(i, field, Number(e.target.value))
                      }
                      className="w-16 pl-3.5"
                    />
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-300">
                      {['L', 'W', 'H'][fi]}
                    </span>
                  </div>
                ))}
                <span className="text-[10px] text-slate-400">cm</span>
              </div>

              {/* Weight */}
              <div className="flex items-center justify-center gap-1">
                <NumberInput
                  value={variant.dw}
                  onChange={(e) =>
                    onPricingVariantFieldChange?.(i, 'dw', Number(e.target.value))
                  }
                  className="w-14"
                />
                <span className="text-[10px] text-slate-400">g</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VariantsSection;
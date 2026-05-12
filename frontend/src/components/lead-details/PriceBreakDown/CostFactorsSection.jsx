import { formatCurrency } from "../../../utils/helpers";
import { useState } from 'react';
import { Pencil, Check, Loader2, RotateCcw, Package, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../../common/ui/Modal';
import Button from '../../common/ui/Button';
import SectionLabel from "./SectionLabel";
import NumberInput from "./NumberInput";

const EditBadge = () => (
  <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5 uppercase tracking-wider">
    editable
  </span>
);

const CostFactorsSection = ({ breakdown, pricingFormulaDraft, onPricingFieldChange, initialBreakdown }) => {
  const [editingKey, setEditingKey] = useState(null);

  const getValue = (item) => {
    if (!item.formulaKey) return item.value;
    if (Array.isArray(item.formulaKey)) {
      return {
        base: pricingFormulaDraft?.[item.formulaKey[0]] ?? item.value?.base ?? 0,
        extraPer500g: pricingFormulaDraft?.[item.formulaKey[1]] ?? item.value?.extraPer500g ?? 0,
      };
    }
    return pricingFormulaDraft?.[item.formulaKey] ?? item.value;
  };

  const handleChange = (item, value, index = 0) => {
    if (!item.formulaKey) return;
    if (Array.isArray(item.formulaKey)) {
      onPricingFieldChange(item.formulaKey[index], Number(value));
    } else {
      onPricingFieldChange(item.formulaKey, Number(value));
    }
  };

  const getInitialItem = (item) => initialBreakdown?.find((i) => i.key === item.key);

  const formatValue = (item, value) => {
    if (item.key === 'lastMile') return `₹${value.base} + ₹${value.extraPer500g}/500g`;
    if (item.type === 'percent') return `${(Number(value) * 100).toFixed(2)}%`;
    return value;
  };

  const isDifferent = (a, b) => {
    if (typeof a === 'object') return JSON.stringify(a) !== JSON.stringify(b);
    return Number(a) !== Number(b);
  };

  if (!breakdown?.length) return null;

  const totalImpact = breakdown.reduce((s, item) => s + (item.impact || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel count={breakdown.length}>Cost factors</SectionLabel>
        <span className="text-[11px] text-slate-400">
          Total: <span className="font-semibold text-slate-700">{formatCurrency(totalImpact)}</span>
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        {/* Header */}
        <div className="grid grid-cols-[1fr_160px_100px] px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Factor</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Value</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right">Impact</span>
        </div>

        {breakdown.map((item, idx) => {
          const initialItem = getInitialItem(item);
          const currentValue = getValue(item);
          const initialValue = initialItem?.value;
          const currentImpact = item.impact;
          const initialImpact = initialItem?.impact;
          const valueChanged = initialValue !== undefined && isDifferent(initialValue, currentValue);
          const impactChanged = initialImpact !== undefined && initialImpact !== currentImpact;
          const showRmb = item.currency === 'RMB';
          const showInr = item.currency === 'INR';
          return (
            <div
              key={item.key}
              className={`grid grid-cols-[1fr_160px_100px] items-center px-4 py-3 transition-colors hover:bg-slate-50/80 ${
                idx < breakdown.length - 1 ? 'border-b border-slate-50' : ''
              } ${valueChanged ? 'bg-indigo-50/30' : ''}`}
            >
              {/* Factor label */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-700 truncate">{item.label}</span>
                {item.editable && <EditBadge />}
              </div>

              {/* Value column */}
              <div className="flex items-center justify-end gap-2">
                {item.key === 'lastMile' ? (
                  editingKey === item.key ? (
                    <div className="flex items-center gap-1">
                      <NumberInput
                        value={currentValue.base}
                        onChange={(e) => handleChange(item, e.target.value, 0)}
                        className="w-14"
                      />
                      <span className="text-[10px] text-slate-400">+</span>
                      <NumberInput
                        value={currentValue.extraPer500g}
                        onChange={(e) => handleChange(item, e.target.value, 1)}
                        className="w-14"
                      />
                      <span className="text-[10px] text-slate-400">/500g</span>
                      <button onClick={() => setEditingKey(null)} className="p-0.5 rounded hover:bg-green-50 transition">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        {valueChanged && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatValue(item, initialValue)}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${valueChanged ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {formatValue(item, currentValue)}
                        </span>
                      </div>
                      {item.editable && (
                        <button onClick={() => setEditingKey(item.key)} className="p-1 rounded hover:bg-slate-100 transition">
                          <Pencil className="w-3 h-3 text-slate-400 hover:text-indigo-500" />
                        </button>
                      )}
                    </div>
                  )
                ) : editingKey === item.key ? (
                  <div className="flex items-center gap-1.5">
                    <NumberInput
                      value={item.type === 'percent' ? (Number(currentValue) * 100).toFixed(2) : currentValue}
                      onChange={(e) => {
                        const raw = item.type === 'percent' ? Number(e.target.value) / 100 : Number(e.target.value);
                        handleChange(item, raw);
                      }}
                      className="w-20"
                    />
                    <button onClick={() => setEditingKey(null)} className="p-0.5 rounded hover:bg-green-50 transition">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
  
                    {/* Currency conversions */}
                    {(showRmb || showInr) && (
                        <div className="flex items-center gap-1.5">
                        {showRmb && (
                            <span className="flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                            <span className="text-amber-400">₹</span>
                            {(Number(currentValue) * item.rmbToInrRate).toFixed(2)}
                            </span>
                        )}
                        {showInr && (
                            <span className="flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                            <span className="text-blue-400">¥</span>
                            {(Number(currentValue) / item.rmbToInrRate).toFixed(2)}
                            </span>
                        )}
                        </div>
                    )}

                    {/* Main value */}
                    <div className="flex flex-col items-end">
                        {valueChanged && (
                        <span className="text-[10px] text-slate-400 line-through">
                            {formatValue(item, initialValue)}
                        </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        valueChanged ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                       <div className="flex gap-1">
                            {(showRmb || showInr) && (
                                <div className="flex items-center gap-1.5">
                                {showRmb && (
                                    <span className="text-amber-400">¥</span>
                                )}
                                {showInr && (
                                    <span className="text-blue-400">₹</span>
                                )}
                                </div>
                            )}

                            {formatValue(item, currentValue)}
                       </div>
                        </span>
                    </div>

                    {/* Edit button */}
                    {item.editable && (
                        <button
                        onClick={() => setEditingKey(item.key)}
                        className="p-1 rounded hover:bg-slate-100 transition"
                        >
                        <Pencil className="w-3 h-3 text-slate-400 hover:text-indigo-500" />
                        </button>
                    )}
                    </div>
                )}
              </div>

              {/* Impact column */}
              <div className="text-right">
                {impactChanged && (
                  <p className="text-[10px] text-slate-400 line-through">{formatCurrency(initialImpact)}</p>
                )}
                <p className={`text-sm font-semibold ${impactChanged ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {formatCurrency(currentImpact)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Total row */}
        <div className="grid grid-cols-[1fr_160px_100px] items-center px-4 py-3 bg-slate-50 border-t border-slate-200">
          <span className="text-xs font-semibold text-slate-600">Total cost</span>
          <div />
          <p className="text-right text-sm font-bold text-slate-900">{formatCurrency(totalImpact)}</p>
        </div>
      </div>
    </div>
  );
};

export default CostFactorsSection;
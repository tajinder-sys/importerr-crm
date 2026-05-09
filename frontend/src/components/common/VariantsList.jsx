import VariantRow from './VariantRow';

const VariantsList = ({
  variants = [],
  sourceVariants = [],
  safeUnitPrice,
  title = 'Variants',
  maxHeight = 'max-h-64',
}) => {
  const totalQty = variants.reduce((sum, v) => sum + (Number(v?.selectedQuantity) || 0), 0);
    console.log('VariantsList', totalQty, variants, sourceVariants)
  return (
    <div className="px-3.5 py-3 border-b border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>

        <span className="text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
          {totalQty} items · {variants.length} SKUs
        </span>
      </div>

      <div className={`flex flex-col gap-1.5 ${maxHeight} overflow-y-auto pr-0.5`}>
        {variants.map((v, i) => (
          <VariantRow
            key={v.skuId || i}
            v={v}
            sourceVariant={sourceVariants?.[i]}
            safeUnitPrice={safeUnitPrice}
          />
        ))}
      </div>
    </div>
  );
};

export default VariantsList;
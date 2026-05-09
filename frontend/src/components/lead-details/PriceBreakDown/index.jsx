import { useState } from 'react';
import { Pencil, Check, Loader2, RotateCcw, Package, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatCurrency } from '../../../utils/helpers';
import ModalTitle from './PricingModalHeader';
import CostFactorsSection from './CostFactorsSection';
import VariantsSection from './VariantsSection';
import SectionLabel from './SectionLabel';
import RecalcSkeleton from './RecalcSkeleton';

const EditBadge = () => (
  <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5 uppercase tracking-wider">
    editable
  </span>
);

const RecalcOverlay = () => (
  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm rounded-2xl">
    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
    </div>
    <span className="text-xs font-medium text-slate-500">Recalculating price…</span>
  </div>
);

const PricingBreakdownModal = ({
  isOpen,
  onClose,
  data,
  pricingFormulaDraft,
  pricingVariantsDraft,
  onPricingVariantQtyChange,
  onPricingFieldChange,
  onApply,
  loading,
  leadVariants,
  initialBreakdown,
  onPricingVariantFieldChange,
  initialFinalPrice,
  initialVariants,
  initialUnitPrice,
  currentUnitPrice
  
}) => {
  const breakdown = data?.breakdown || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <ModalTitle
          finalPrice={data?.finalPrice}
          initialFinalPrice={initialFinalPrice}
          initialUnitPrice={initialUnitPrice}
          currentUnitPrice={currentUnitPrice}
        />
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-[11px] text-slate-400 italic">Changes apply after recalculating</p>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApply(true)}
              loading={loading}
              disabled={loading}
              startIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {loading ? 'Resetting…' : 'Reset'}
            </Button>
            <Button
              size="sm"
              onClick={() => onApply(false)}
              loading={loading}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
            >
              {loading ? 'Recalculating…' : 'Recalculate price'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative">
        {loading ? <RecalcSkeleton />
        :
        <>
          <SectionLabel >Category: {data?.raw?.category ? (data?.raw?.category.name +'('+ data?.raw?.category.id + ')') : '-'}</SectionLabel> 

          <div className="flex flex-col gap-6 py-1">
            <VariantsSection
              pricingVariantsDraft={pricingVariantsDraft}
              leadVariants={leadVariants}
              onPricingVariantQtyChange={onPricingVariantQtyChange}
              onPricingVariantFieldChange={onPricingVariantFieldChange}
              initialVariants={initialVariants}
            />

            <CostFactorsSection
              breakdown={breakdown}
              pricingFormulaDraft={pricingFormulaDraft}
              onPricingFieldChange={onPricingFieldChange}
              initialBreakdown={initialBreakdown}
            />
          </div>
        </>
        }
      </div>
    </Modal>
  );
};

export default PricingBreakdownModal;
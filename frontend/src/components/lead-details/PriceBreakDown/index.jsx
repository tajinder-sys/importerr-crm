import { RotateCcw } from 'lucide-react';
import Modal from '../../common/ui/Modal';
import Button from '../../common/ui/Button';
import ModalTitle from './PricingModalHeader';
import CostFactorsSection from './CostFactorsSection';
import VariantsSection from './VariantsSection';
import SectionLabel from './SectionLabel';
import RecalcSkeleton from './RecalcSkeleton';




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
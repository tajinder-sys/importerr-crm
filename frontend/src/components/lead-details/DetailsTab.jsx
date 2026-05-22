import { useMemo, useState } from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../common/ui/Card';
import Button from '../common/ui/Button';
import Skeleton from '../common/ui/Skeleton';
import Modal from '../common/ui/Modal';
import { UiSectionTitle } from '../common/ui/Typography';
import { IMPORTERR_URL } from '../../utils/api';
import AddManualProductModal from './AddManualProductModal';
import LeadQuickFacts from './LeadQuickFacts';
import VariantLinesPanel from './VariantLinesPanel';
import { totalQtyFromLeadVariants } from '../../utils/leadVariants';
import {
  getActualProductFromLead,
  getActualSku,
  totalQtyFromActualProduct,
  actualProductToDisplayRows,
} from '../../utils/actualProduct';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const flattenVariants = (variants) => {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(variants.variantLines)) return variants.variantLines;
  if (Array.isArray(variants.variants)) return variants.variants;
  if (Array.isArray(variants.items)) return variants.items;
  return [];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProductSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
    <Skeleton className="h-24 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

const EmptyProduct = ({ hasLeadSku, children }) => (
  <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-6 text-center dark:border-slate-600 dark:bg-slate-800/50">
    <p className="text-sm text-gray-600 dark:text-slate-400">
      {hasLeadSku
        ? 'Product auto-loading from lead SKU.'
        : <>No product linked yet. Search by SKU to attach one from Importerr.</>}
    </p>
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DetailsTab = ({
  lead,
  selectedProduct,
  isFetchingProduct,
  embedded = false,
  onAttachManualProduct,
  onSetBuyingSku,
}) => {
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [manualProductOpen, setManualProductOpen] = useState(false);
  const [manualProductMode, setManualProductMode] = useState('add');
  const [buyingSkuOpen, setBuyingSkuOpen] = useState(false);

  const actualProduct = useMemo(() => getActualProductFromLead(lead), [lead]);
  const hasLeadSku = Boolean(String(lead?.productSku || getActualSku(lead) || '').trim());
  const actualSkuDisplay = getActualSku(lead);
  const buyingSkuDisplay = String(lead?.productSku || '').trim();
  const showBuyingSkuRow = Boolean(actualSkuDisplay && buyingSkuDisplay && actualSkuDisplay !== buyingSkuDisplay);
  const leadVariants = lead?.variants && typeof lead.variants === 'object' ? lead.variants : null;

  const leadVariantRows = useMemo(() => flattenVariants(leadVariants), [leadVariants]);
  const actualVariantRows = useMemo(
    () => actualProductToDisplayRows(actualProduct),
    [actualProduct]
  );
  const actualTotalQty = totalQtyFromActualProduct(actualProduct);
  const buyingTotalQty =
    Number(lead?.totalQuantity) > 0
      ? Number(lead.totalQuantity)
      : totalQtyFromLeadVariants(leadVariants);

  const canEditLinkedProduct =
    typeof onAttachManualProduct === 'function' && hasLeadSku;

  const showManualProductCta =
    typeof onAttachManualProduct === 'function' &&
    !hasLeadSku &&
    leadVariantRows.length === 0 &&
    !selectedProduct;

  const memoEditContext = useMemo(() => {
    if (!manualProductOpen || manualProductMode !== 'edit') return null;
    const sku = String(lead?.productSku || '').trim();
    if (!sku) return null;
    return { sku, variantRows: leadVariantRows };
  }, [manualProductOpen, manualProductMode, lead?.productSku, leadVariantRows]);

  const buyingSkuContext = useMemo(() => {
    if (!buyingSkuOpen) return null;
    return {
      actualProduct,
      actualVariantRows,
      currentBuyingSku: buyingSkuDisplay,
      variantRows: leadVariantRows,
    };
  }, [buyingSkuOpen, actualProduct, actualVariantRows, actualTotalQty, buyingSkuDisplay, leadVariantRows]);

  const openManualProductAdd = () => {
    setManualProductMode('add');
    setManualProductOpen(true);
  };

  const openManualProductEdit = () => {
    setManualProductMode('edit');
    setManualProductOpen(true);
  };

  const closeManualProductModal = () => {
    setManualProductOpen(false);
    setManualProductMode('add');
  };

  const openBuyingSku = () => {
    if (typeof onSetBuyingSku !== 'function') return;
    setBuyingSkuOpen(true);
  };

  const closeBuyingSkuModal = () => setBuyingSkuOpen(false);

  const content = (
    <div className={embedded ? 'space-y-4' : 'space-y-4 bg-slate-50/60 dark:bg-slate-900/40'}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Product */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          {isFetchingProduct ? (
              <ProductSkeleton />
            ) : selectedProduct ? (
              <div className="space-y-3">

                <div className="flex justify-between items-center border-b pb-2 dark:border-slate-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Details</p>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {hasLeadSku ? (
                      <a
                        href={`${IMPORTERR_URL}/product-details?ali=1&offer=${lead?.productSku}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    ) : null}
                    {canEditLinkedProduct ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        startIcon={<Pencil className="h-3 w-3" />}
                        onClick={openManualProductEdit}
                      >
                        Edit product
                      </Button>
                    ) : null}
                    {typeof onSetBuyingSku === 'function' && hasLeadSku ? (
                      <Button type="button" size="sm" variant="primary" onClick={openBuyingSku}>
                        Set buying SKU
                      </Button>
                    ) : null}
                  </div>
                </div>

                {(actualSkuDisplay || buyingSkuDisplay) && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-[11px] dark:border-slate-600 dark:bg-slate-800/60">
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Actual SKU:</span>{' '}
                      <span className="font-mono">{actualSkuDisplay || '—'}</span>
                    </p>
                    {showBuyingSkuRow ? (
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">Buying SKU:</span>{' '}
                        <span className="font-mono">{buyingSkuDisplay}</span>
                        {buyingTotalQty > 0 ? (
                          <span className="ml-1 text-slate-500">· Qty {buyingTotalQty}</span>
                        ) : null}
                      </p>
                    ) : null}
                    {actualTotalQty > 0 && !showBuyingSkuRow ? (
                      <p className="mt-1 text-slate-500">Qty {actualTotalQty}</p>
                    ) : null}
                  </div>
                )}

                <div className="grid grid-cols-[80px_1fr] gap-3">
                  
                  {/* Image (click to preview) */}
                  <button
                    onClick={() => setPreviewImageUrl(selectedProduct?.imageUrl)}
                    className="border rounded-lg overflow-hidden bg-white"
                  >
                    {selectedProduct?.imageUrl ? (
                      <img
                        src={selectedProduct.imageUrl}
                        className="h-20 w-full object-contain"
                      />
                    ) : (
                      <div className="h-20 flex items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {selectedProduct?.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {showBuyingSkuRow ? `Buying qty: ${buyingTotalQty}` : `Qty: ${buyingTotalQty || actualTotalQty}`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyProduct hasLeadSku={hasLeadSku}>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {showManualProductCta ? (
                    <Button type="button" size="sm" variant="primary" onClick={openManualProductAdd}>
                      Add manual product
                    </Button>
                  ) : null}
                  {typeof onSetBuyingSku === 'function' && hasLeadSku ? (
                    <Button type="button" size="sm" variant="outline" onClick={openBuyingSku}>
                      Set buying SKU
                    </Button>
                  ) : null}
                  {canEditLinkedProduct && !selectedProduct ? (
                    <Button type="button" size="sm" variant="outline" startIcon={<Pencil className="h-3 w-3" />} onClick={openManualProductEdit}>
                      Edit product & variants
                    </Button>
                  ) : null}
                </div>
              </EmptyProduct>
            )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 dark:border-slate-700 dark:bg-slate-800">
          {actualVariantRows.length > 0 && (
            <VariantLinesPanel
              title="Actual variants (customer / inquiry)"
              variants={actualVariantRows}
              accent="amber"
              defaultOpen={!showBuyingSkuRow}
            />
          )}
          {leadVariantRows.length > 0 && (
            <VariantLinesPanel
              title={showBuyingSkuRow ? 'Buying variants' : 'Variants requirement'}
              variants={leadVariants}
              accent={showBuyingSkuRow ? 'indigo' : 'slate'}
              defaultOpen
            />
          )}
          {actualVariantRows.length === 0 && leadVariantRows.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-slate-400">No variant lines on this lead.</p>
          )}
        </div>
      </div>

    
    </div>
  );

  return (
    <>
      {embedded ? (
        content
      ) : (
        <Card>
          <CardHeader>
            <UiSectionTitle>Product Details</UiSectionTitle>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      <Modal
        isOpen={Boolean(previewImageUrl)}
        onClose={() => setPreviewImageUrl('')}
        title="Image Preview"
        size="lg"
      >
        <div className="flex items-center justify-center">
          <img
            src={previewImageUrl}
            className="max-h-[70vh] object-contain"
          />
        </div>
      </Modal>

      {typeof onAttachManualProduct === 'function' ? (
        <AddManualProductModal
          isOpen={manualProductOpen}
          onClose={closeManualProductModal}
          mode={manualProductMode}
          editKey={lead?._id}
          editContext={memoEditContext}
          leadName={lead?.name || lead?.email || ''}
          onLinked={onAttachManualProduct}
        />
      ) : null}

      {typeof onSetBuyingSku === 'function' ? (
        <AddManualProductModal
          isOpen={buyingSkuOpen}
          onClose={closeBuyingSkuModal}
          mode="buying"
          editKey={`${lead?._id}-buying`}
          editContext={buyingSkuContext}
          leadName={lead?.name || lead?.email || ''}
          onLinked={onSetBuyingSku}
        />
      ) : null}
    </>
  );
};

export default DetailsTab;
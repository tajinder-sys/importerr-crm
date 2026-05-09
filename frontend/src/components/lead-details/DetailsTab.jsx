import { useMemo, useState } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../common/Card';
import Button from '../common/Button';
import Skeleton from '../common/Skeleton';
import Modal from '../common/Modal';
import { formatCurrency, formatDateIndian, formatPhone } from '../../utils/helpers';
import { UiSectionTitle } from '../common/ui/Typography';
import { IMPORTERR_URL } from '../../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getVariantImageUrl = (v) =>
  v?.imageUrl || v?.image || v?.imgUrl || v?.thumbnail || '';

const getVariantKey = (v, idx) =>
  String(v?.skuId || v?.sku || v?.id || v?.label || `lead-variant-${idx}`);

const flattenVariants = (variants) => {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(variants.variantLines)) return variants.variantLines;
  if (Array.isArray(variants.variants)) return variants.variants;
  if (Array.isArray(variants.items)) return variants.items;
  return [];
};

const getQty = (row) => Number(row?.quantity ?? row?.qty ?? row?.totalQuantity ?? 0);

// ─── Sub-components ───────────────────────────────────────────────────────────

const LeadInfoRow = ({ label, value, right = false }) => (
  <div className="flex items-start justify-between gap-4 border-b border-dashed border-gray-100 py-1.5 last:border-b-0">
    <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
    <span className={`text-xs text-gray-800 ${right ? 'max-w-[70%] text-right' : ''}`}>
      {value || '-'}
    </span>
  </div>
);

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

const EmptyProduct = ({ hasLeadSku }) => (
  <div className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/70 p-6 text-center">
    <p className="text-sm text-gray-600">
      {hasLeadSku
        ? 'Product auto-loading from lead SKU.'
        : <>Enter SKU and click <span className="font-semibold">Fetch Product</span></>}
    </p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DetailsTab = ({
  lead,
  selectedProduct,
  isFetchingProduct,
  embedded = false,
}) => {
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [variantsOpen, setVariantsOpen] = useState(false);

  const hasLeadSku = Boolean(String(lead?.productSku || '').trim());
  const leadVariants = lead?.variants && typeof lead.variants === 'object' ? lead.variants : null;

  const leadVariantRows = useMemo(() => flattenVariants(leadVariants), [leadVariants]);

  const content = (
    <div className={embedded ? 'space-y-4' : 'space-y-4 bg-slate-50/60'}>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Lead */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <LeadInfoRow label="Name" value={lead?.name} />
          <LeadInfoRow label="Email" value={lead?.email} />
          <LeadInfoRow label="Phone" value={lead?.phone ? formatPhone(lead.phone) : '-'} />
          <LeadInfoRow label="Submitted" value={lead?.createdAt ? formatDateIndian(lead.createdAt) : '-'} />
        </div>

        {/* Product */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {isFetchingProduct ? (
            <ProductSkeleton />
          ) : selectedProduct ? (
            <div className="space-y-3">

              <div className="flex justify-between items-center border-b pb-2">
                <p className="text-sm font-semibold text-gray-900">Product Details</p>

                {hasLeadSku && (
                  <a
                    href={`${IMPORTERR_URL}/product-details?ali=1&offer=${lead?.productSku}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </a>
                )}
              </div>

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
                    Qty: {lead?.totalQuantity}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyProduct hasLeadSku={hasLeadSku} />
          )}
        </div>
      </div>

      {/* ─── Variants Accordion ─── */}
      {leadVariantRows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

          {/* Header */}
          <button
            onClick={() => setVariantsOpen(v => !v)}
            className="w-full flex justify-between items-center px-3.5 py-3 bg-gray-50"
          >
            <span className="text-xs font-semibold text-gray-600">
              Variants Requirement ({leadVariantRows.length})
            </span>

            <svg
              className={`w-4 h-4 transition ${variantsOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Body */}
          {variantsOpen && (
            <div className="divide-y max-h-64 overflow-y-auto">
              {leadVariantRows.map((variant, idx) => (
                <div
                  key={getVariantKey(variant, idx)}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Image */}
                        <div className="h-10 w-10 rounded-md flex items-center justify-center overflow-hidden">
                          {getVariantImageUrl(variant) ? (
                              <button
                                  onClick={() => setPreviewImageUrl(getVariantImageUrl(variant))}
                                  className="h-9 w-9 border rounded-md overflow-hidden flex items-center justify-center"
                                >
                                <img
                                  src={getVariantImageUrl(variant)}
                                  alt={variant?.skuId}
                                  className="h-8 w-8 object-contain"
                                />
                          </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">No</span>
                          )}
                        </div>

                        {/* SKU + attributes */}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            {variant?.label || variant?.skuId || 'Variant'} {variant?.skuId}
                          </p>

                          {Array.isArray(variant?.attributes) && variant.attributes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variant.attributes.slice(0, 2).map((attr, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600"
                                >
                                  {attr?.value || attr?.attributeValue}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                  <span className="text-sm font-medium text-gray-900">
                    {getQty(variant)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
    </>
  );
};

export default DetailsTab;
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Send, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../common/ui/Card';
import Button from '../common/ui/Button';
import { UiSectionTitle } from '../common/ui/Typography';
import DetailsTab from './DetailsTab';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import Snackbar from '../common/ui/Snackbar';
import PricingBreakdownModal from './PriceBreakDown';
import QuoteEmailPreviewModal from './QuoteEmailPreviewModal';
import VariantsList from '../common/ui/VariantsList';
import { formatCurrency } from '../../utils/helpers';


const PricingSnapshotSkeleton = () => (
  <div className="divide-y divide-slate-100 animate-pulse">
    <div className="px-3.5 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-3 w-12 bg-slate-200 rounded" />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-50 px-2.5 py-2.5 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-slate-200 rounded-md" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-2.5 w-16 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-2.5 w-12 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="px-3.5 py-3">
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DiscountBadge = ({ percent }) => {
  if (!percent || percent === 0) return <span className="text-sm text-slate-400">—</span>;
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
      percent > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
    }`}>
      {percent > 0 ? '−' : '+'}{Math.abs(percent).toFixed(2)}%
    </span>
  );
};

const LeadDetailsOverviewCard = ({
  lead,
  selectedProduct,
  setFinalPrice,
  finalPrice,
  initialFinalPrice,
  isFetchingFinalPrice,
  pricingFormulaDraft,
  initialBreakdown,
  pricingVariantsDraft,
  setInitialFinalPrice,
  setIsFetchingFinalPrice,
  setPricingFormulaDraft,
  setInitialBreakdown,
  setPricingVariantsDraft,
  onAttachManualProduct,
  onSetBuyingSku,
}) => {
  const [open, setOpen] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [quotePreviewOpen, setQuotePreviewOpen] = useState(false);
  const [quotePreviewLoading, setQuotePreviewLoading] = useState(false);
  const [quotePreview, setQuotePreview] = useState(null);
  const [initialVariants, setInitialVariants] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [lead?._id, lead?.productSku]);

  const leadVariants =
    lead?.variants && typeof lead.variants === 'object' ? lead.variants : null;

  const currentFinalPrice = Number(finalPrice?.finalPrice || 0);
  const baseFinalPrice = Number(initialFinalPrice || 0);

  const totalQty = useMemo(() => {
    if (!pricingVariantsDraft?.length) return 1;
    return pricingVariantsDraft.reduce((sum, v) => sum + Number(v.selectedQuantity || 0), 0);
  }, [pricingVariantsDraft]);

  const initialQty = Number(lead?.totalQuantity || totalQty || 1);
  const baseUnitPrice = baseFinalPrice / initialQty;
  const currentUnitPrice = currentFinalPrice / totalQty;
  const safeUnitPrice = totalQty ? currentFinalPrice / totalQty : 0;

  const discountPercent = useMemo(() => {
    if (!baseUnitPrice) return 0;
    return ((baseUnitPrice - currentUnitPrice) / baseUnitPrice) * 100;
  }, [baseUnitPrice, currentUnitPrice]);

  const savedAmount = baseFinalPrice - currentFinalPrice;

  const flattenVariants = (variants) => {
    if (!variants) return [];
    if (Array.isArray(variants)) return variants;
    if (Array.isArray(variants.variantLines)) return variants.variantLines;
    if (Array.isArray(variants.variants)) return variants.variants;
    return [];
  };

  const fetchFinalPriceByOfferId = async (offerId, variants, overrides) => {
    if (!offerId) return;
    setIsFetchingFinalPrice(true);
    try {
      const normalizedVariants = flattenVariants(variants).map((v) => ({
        ...v,
        skuId: Number(v?.skuId),
      }));
      const { data } = await api.post(API_ROUTES.importerr.finalPriceByOfferId(), {
        offerId,
        variants: normalizedVariants,
        ...(overrides ? { overrides } : {}),
      });
      setFinalPrice(data);
      setInitialFinalPrice((prev) => prev ?? data?.finalPrice);
      setInitialBreakdown((prev) => prev ?? data?.breakdown);
      setInitialVariants((prev) => prev ?? data?.variants);
      setPricingVariantsDraft(data?.variants);
      return data;
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingFinalPrice(false);
    }
  };

  const onPricingVariantFieldChange = (index, field, value) => {
    setPricingVariantsDraft((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index] };
      if (!updated[index].overrides) updated[index].overrides = {};
      updated[index].overrides[field] = value;
      if (field === 'weight') {
        updated[index].dw = value;
      } else {
        updated[index][field] = value;
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!lead?.productSku || hasFetchedRef.current || finalPrice) return;
    hasFetchedRef.current = true;
    fetchFinalPriceByOfferId(lead.productSku, lead.variants);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.productSku]);

  useEffect(() => {
    if (!finalPrice?.formula) return;
    setPricingFormulaDraft((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return Object.fromEntries(
        Object.entries(finalPrice.formula).map(([k, v]) => [k, v ?? ''])
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalPrice]);

  const handleFormulaFieldChange = (key, value) => {
    setPricingFormulaDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleRecalculatePrice = async (reset = false) => {
    const overrides = { formula: pricingFormulaDraft };
    const data = await fetchFinalPriceByOfferId(
      lead?.productSku,
      reset ? lead?.variants : pricingVariantsDraft,
      reset ? {} : overrides
    );
    if (reset && data) {
      setInitialBreakdown(data.breakdown);
      setInitialFinalPrice(data.finalPrice);
      setPricingFormulaDraft(data.formula);
      setPricingVariantsDraft(data.variants);
      setInitialVariants(data.variants);
    }
  };

  const buildQuotePayload = () => ({
    userId: lead?.userId,
    offerId: lead?.productSku,
    leadId: lead?._id,
    variants: pricingVariantsDraft,
    pricing: {
      baseAlgorithmId: finalPrice?.algoId,
      originalBreakDown: initialBreakdown || [],
      updatedBreakDown: finalPrice?.breakdown || [],
      formula: finalPrice?.raw?.formula || {},
      category: finalPrice?.raw?.category,
    },
    amounts: {
      initialFinalPrice: baseFinalPrice,
      finalPrice: currentFinalPrice,
      discountPercent: Number(discountPercent.toFixed(2)),
      savedAmount: Number(savedAmount.toFixed(2)),
      initialUnitPrice: baseUnitPrice,
    },
  });

  const handleOpenQuotePreview = async () => {
    if (!lead?.email?.trim()) {
      setSnackbar({ open: true, message: 'Lead has no email address', type: 'error' });
      return;
    }
    setQuotePreviewOpen(true);
    setQuotePreview(null);
    setQuotePreviewLoading(true);
    try {
      const res = await api.post(API_ROUTES.quote.previewEmail(), buildQuotePayload());
      setQuotePreview(res?.data || null);
    } catch (err) {
      console.error('Quote preview failed', err);
      setSnackbar({
        open: true,
        message: err?.message || 'Failed to load email preview',
        type: 'error',
      });
      setQuotePreviewOpen(false);
    } finally {
      setQuotePreviewLoading(false);
    }
  };

  const handleConfirmSendQuote = async () => {
    try {
      setIsSendingQuote(true);
      await api.post(API_ROUTES.quote.send(), buildQuotePayload());
      setQuotePreviewOpen(false);
      setQuotePreview(null);
      setSnackbar({ open: true, message: 'Quote sent successfully', type: 'success' });
      handleRecalculatePrice(true);
    } catch (err) {
      console.error('Send quote failed', err);
      setSnackbar({ open: true, message: err?.message || 'Failed to send quote', type: 'error' });
    } finally {
      setIsSendingQuote(false);
    }
  };

  const sourceVariants = Array.isArray(leadVariants)
    ? leadVariants
    : leadVariants?.variantLines || leadVariants?.variants || [];

  return (
    <>
      <Card className="rounded-b-2xl rounded-t-none border-slate-200 shadow-sm">
        <CardContent className="space-y-4 px-4 py-4">
          <DetailsTab
            lead={lead}
            selectedProduct={selectedProduct}
            onAttachManualProduct={onAttachManualProduct}
            onSetBuyingSku={onSetBuyingSku}
          />

          {/* ── Pricing snapshot ── */}
          <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700">

            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pricing snapshot</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRecalculatePrice(false)}
                  disabled={isFetchingFinalPrice}
                  startIcon={<RotateCcw className="w-3 h-3" />}
                  className="text-xs text-slate-600 border-slate-200 hover:bg-slate-100"
                >
                  {isFetchingFinalPrice ? 'Recalculating…' : 'Recalculate'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(true)}
                  startIcon={<Eye className="w-3.5 h-3.5" />}
                  className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                >
                  Breakdown
                </Button>
              </div>
            </div>

            {isFetchingFinalPrice ? (
              <PricingSnapshotSkeleton />
            ) : (
              <>
                {/* ── Variants list ── */}
                {pricingVariantsDraft?.length > 0 && (
                  <VariantsList
                    variants={pricingVariantsDraft}
                    sourceVariants={sourceVariants}
                    safeUnitPrice={safeUnitPrice}
                  />
                )}

                {/* ── Summary ── */}
                <div className="px-3.5 py-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Summary
                  </span>

                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-700">

                    {/* Initial price row — only when prices differ */}
                    {baseFinalPrice > 0 && baseFinalPrice !== currentFinalPrice && (
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/60 dark:bg-slate-800/60">
                        <span className="text-[11px] text-slate-400">Initial price</span>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 line-through dark:text-slate-500">{formatCurrency(baseFinalPrice)}</p>
                          <p className="text-[9px] text-slate-300 dark:text-slate-600">{formatCurrency(baseUnitPrice)} / unit</p>
                        </div>
                      </div>
                    )}

                    {/* Final price */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800">
                      <span className="text-xs text-slate-500">Final price</span>
                      <div className="text-right">
                        <p className="text-[17px] font-bold text-slate-900 leading-tight dark:text-slate-100">
                          {formatCurrency(currentFinalPrice)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 dark:text-slate-500">
                          {formatCurrency(currentUnitPrice)} / unit
                        </p>
                      </div>
                    </div>

                    {/* Unit price with change indicator */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-xs text-slate-500">Unit price</span>
                      <div className="flex items-center gap-2">
                        {baseUnitPrice !== currentUnitPrice && baseUnitPrice > 0 && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatCurrency(baseUnitPrice)}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-900">
                          {formatCurrency(currentUnitPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Saved amount — only when positive */}
                    {savedAmount > 0 && (
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[11px] text-slate-400">You save</span>
                        <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                          {formatCurrency(savedAmount)}
                        </span>
                      </div>
                    )}

                    {/* Discount + Send quote */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Discount</span>
                        <DiscountBadge percent={discountPercent} />
                      </div>
                      {discountPercent > 0 && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleOpenQuotePreview}
                          disabled={isSendingQuote || quotePreviewLoading}
                          startIcon={<Send className="w-3 h-3" />}
                          className="text-[11px]"
                        >
                          {quotePreviewLoading ? 'Loading…' : 'Send quote'}
                        </Button>
                      )}
                    </div>

                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <PricingBreakdownModal
        isOpen={open}
        onClose={() => setOpen(false)}
        data={finalPrice}
        pricingFormulaDraft={pricingFormulaDraft}
        pricingVariantsDraft={pricingVariantsDraft}
        initialVariants={initialVariants}
        onPricingVariantQtyChange={(i, qty) =>
          setPricingVariantsDraft((prev) =>
            prev.map((v, idx) => (idx === i ? { ...v, selectedQuantity: qty } : v))
          )
        }
        onPricingFieldChange={handleFormulaFieldChange}
        onApply={handleRecalculatePrice}
        loading={isFetchingFinalPrice}
        leadVariants={leadVariants}
        initialBreakdown={initialBreakdown}
        onPricingVariantFieldChange={onPricingVariantFieldChange}
        initialFinalPrice={initialFinalPrice}
        initialUnitPrice={baseUnitPrice}
        currentUnitPrice={currentUnitPrice}
      />

      <QuoteEmailPreviewModal
        isOpen={quotePreviewOpen}
        onClose={() => {
          if (!isSendingQuote) {
            setQuotePreviewOpen(false);
            setQuotePreview(null);
          }
        }}
        preview={quotePreview}
        isLoading={quotePreviewLoading}
        isSending={isSendingQuote}
        onSend={handleConfirmSendQuote}
        leadEmail={lead?.email}
      />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
};

export default LeadDetailsOverviewCard;
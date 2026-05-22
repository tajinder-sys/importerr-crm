import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Package, ChevronLeft, ChevronRight, Minus, Plus, Images } from 'lucide-react';
import Modal from '../common/ui/Modal';
import Button from '../common/ui/Button';
import Input from '../common/ui/Input';
import ImagePreview from '../common/ui/ImagePreview';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { formatCurrency } from '../../utils/helpers';
import { mapImporterrVariationToLeadVariant } from './productUtils';
import {
  buildActualProductPayload,
  totalQtyFromActualProduct,
  actualProductToDisplayRows,
} from '../../utils/actualProduct';

const pushUnique = (list, url) => {
  const u = String(url || '').trim();
  if (!u || list.includes(u)) return;
  list.push(u);
};

/** All distinct product + variant image URLs for gallery. */
const collectProductImages = (product) => {
  if (!product) return [];
  const urls = [];
  const arr = product.imgUrl;
  if (Array.isArray(arr)) arr.forEach((u) => pushUnique(urls, u));
  else if (typeof arr === 'string') pushUnique(urls, arr);
  if (product.thumbnailImage) pushUnique(urls, product.thumbnailImage);
  (product.variations || []).forEach((v) => {
    (v.skuAttributes || []).forEach((a) => {
      pushUnique(urls, a.skuImageUrl);
      pushUnique(urls, a.thumbnailImage);
    });
  });
  return urls;
};

const variationThumb = (v) => mapImporterrVariationToLeadVariant(v).imageUrl;
const variationPrice = (v) => Number(v.ap ?? v.finalPrice ?? v.consignPrice ?? 0);

const leadRowQty = (row) =>
  Math.max(1, Number(row?.selectedQuantity ?? row?.quantity ?? row?.qty ?? row?.totalQuantity ?? 1) || 1);

/** Map saved lead variant rows onto Importerr variations (checkbox + qty). */
const applyLeadSelectionToProduct = (p, variantRows) => {
  const rows = Array.isArray(variantRows) ? variantRows : [];
  const bySku = new Map();
  rows.forEach((r) => {
    const id = r?.skuId ?? r?.sku;
    if (id == null || id === '') return;
    bySku.set(String(id), r);
  });
  const nextQty = {};
  const nextInc = {};
  (p.variations || []).forEach((v) => {
    if (v?.skuId == null) return;
    const row = bySku.get(String(v.skuId));
    nextQty[v.skuId] = row ? leadRowQty(row) : 1;
    nextInc[v.skuId] = Boolean(row);
  });
  return { nextQty, nextInc };
};

const resetVariantStateForProduct = (p) => {
  const nextQty = {};
  const nextInc = {};
  (p.variations || []).forEach((v) => {
    if (v?.skuId == null) return;
    nextQty[v.skuId] = 1;
    nextInc[v.skuId] = false;
  });
  return { nextQty, nextInc };
};

const AddManualProductModal = ({
  isOpen,
  onClose,
  onLinked,
  leadName,
  mode = 'add',
  editKey,
  editContext = null,
}) => {
  const [skuInput, setSkuInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [qtyBySkuId, setQtyBySkuId] = useState({});
  const [included, setIncluded] = useState({});
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const variations = useMemo(() => {
    if (!product?.variations || !Array.isArray(product.variations)) return [];
    return product.variations;
  }, [product]);

  const productImages = useMemo(() => collectProductImages(product), [product]);

  const bumpQty = (skuId, delta) => {
    setQtyBySkuId((prev) => {
      const cur = prev[skuId] ?? 1;
      return { ...prev, [skuId]: Math.max(1, cur + delta) };
    });
  };

  const toggleIncluded = (skuId) => {
    setIncluded((prev) => ({ ...prev, [skuId]: !prev[skuId] }));
  };

  const openGallery = useCallback((index) => {
    const n = productImages.length;
    const safe = n ? Math.max(0, Math.min(index, n - 1)) : 0;
    setGalleryIndex(safe);
    setGalleryOpen(true);
  }, [productImages]);

  const galleryPrev = useCallback(() => {
    setGalleryIndex((i) => (productImages.length ? (i - 1 + productImages.length) % productImages.length : 0));
  }, [productImages.length]);

  const galleryNext = useCallback(() => {
    setGalleryIndex((i) => (productImages.length ? (i + 1) % productImages.length : 0));
  }, [productImages.length]);

  useEffect(() => {
    if (!galleryOpen || productImages.length === 0) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') galleryPrev();
      if (e.key === 'ArrowRight') galleryNext();
      if (e.key === 'Escape') setGalleryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryOpen, productImages.length, galleryPrev, galleryNext]);

  /** Opening in add mode: empty form. */
  useEffect(() => {
    if (!isOpen || mode !== 'add') return;
    const t = setTimeout(() => {
      setSkuInput('');
      setProduct(null);
      setError('');
      setGalleryOpen(false);
      setQtyBySkuId({});
      setIncluded({});
      setGalleryIndex(0);
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, mode]);

  const isBuying = mode === 'buying';

  /** Edit / buying: load product by SKU and restore variant lines. */
  useEffect(() => {
    if (!isOpen || (mode !== 'edit' && mode !== 'buying') || !editContext) return;
    const sku = String(
      mode === 'buying' ? editContext.currentBuyingSku || '' : editContext.sku || ''
    ).trim();
    if (!sku) return;

    let cancelled = false;

    const run = async () => {
      setSearching(true);
      setError('');
      setGalleryOpen(false);
      setProduct(null);
      setSkuInput(sku);
      try {
        const res = await api.get(API_ROUTES.importerr.productBySku(sku));
        if (cancelled) return;
        if (!res?.success) throw new Error(res?.message || 'Product not found');
        const p = res?.data;
        if (!p) throw new Error('Product not found');
        setProduct(p);
        const { nextQty, nextInc } = applyLeadSelectionToProduct(p, editContext.variantRows);
        setQtyBySkuId(nextQty);
        setIncluded(nextInc);
        setGalleryIndex(0);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Failed to fetch product');
          setProduct(null);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, editKey, editContext]);

  const handleSearch = async () => {
    const sku = String(skuInput || '').trim();
    setError('');
    setProduct(null);
    setGalleryOpen(false);
    if (!sku) {
      setError('Enter a product SKU');
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(API_ROUTES.importerr.productBySku(sku));
      if (!res?.success) throw new Error(res?.message || 'Product not found');
      const p = res?.data;
      if (!p) throw new Error('Product not found');
      setProduct(p);
      const { nextQty, nextInc } = resetVariantStateForProduct(p);
      setQtyBySkuId(nextQty);
      setIncluded(nextInc);
      setGalleryIndex(0);
    } catch (e) {
      setError(e?.message || 'Failed to fetch product');
    } finally {
      setSearching(false);
    }
  };

  const selectedVariantCount = useMemo(
    () => variations.filter((v) => v?.skuId != null && included[v.skuId]).length,
    [variations, included]
  );

  const handleSave = async () => {
    if (!product) return;
    const lines = variations.length
      ? variations
          .filter((v) => v?.skuId != null && included[v.skuId])
          .map((v) => mapImporterrVariationToLeadVariant(v, qtyBySkuId[v.skuId] ?? 1))
      : [];
    if (variations.length > 0 && !lines.length) {
      setError('Select at least one variant');
      return;
    }
    const offerOrSku = String(product.offerId || product.sku || '').trim();
    if (!offerOrSku) {
      setError('Product is missing offer id / sku');
      return;
    }
    const totalQuantity = lines.reduce((s, l) => s + Number(l.selectedQuantity || 0), 0);
    setSaving(true);
    setError('');
    try {
      const payload = {
        productId: product._id ? String(product._id) : null,
        productSku: offerOrSku,
        variants: lines,
        totalQuantity,
      };
      if (isBuying) {
        payload.actualProduct =
          editContext?.actualProduct ||
          buildActualProductPayload({
            sku: editContext?.actualProduct?.sku || editContext?.actualSku,
            variantRows: editContext?.actualVariantRows,
          });
        delete payload.actualSku;
        delete payload.actualVariants;
        delete payload.actualTotalQuantity;
        await onLinked(payload, { isBuyingSku: true });
      } else {
        if (!isEdit) {
          payload.actualProduct = buildActualProductPayload({ sku: offerOrSku, variants: lines });
        }
        await onLinked(payload, { isEdit: mode === 'edit' });
      }
      setSkuInput('');
      setProduct(null);
      setQtyBySkuId({});
      setIncluded({});
      setGalleryOpen(false);
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setError('');
    setGalleryOpen(false);
    onClose();
  };

  const isEdit = mode === 'edit';
  const modalTitle = isBuying
    ? 'Set buying SKU'
    : isEdit
      ? 'Edit product & variants'
      : 'Add product by SKU';
  const primaryLabel = isBuying ? 'Save buying SKU' : isEdit ? 'Save changes' : 'Add to lead';
  const skuFieldLocked = isEdit;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={<h2 className="m-0 text-sm font-semibold text-gray-900">{modalTitle}</h2>}
        size="xl"
      >
        <div className="space-y-3 text-xs leading-snug text-gray-700">
          {leadName ? (
            <p className="text-[11px] text-gray-500">
              {isBuying ? 'Lead' : 'Linking to'}{' '}
              <span className="font-medium text-gray-800">{leadName}</span>
            </p>
          ) : null}

          {isBuying && (editContext?.actualProduct?.sku || editContext?.actualSku) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 space-y-2">
              <p>
                <span className="font-semibold">Actual SKU</span> (customer / inquiry):{' '}
                <span className="font-mono">
                  {editContext.actualProduct?.sku || editContext.actualSku}
                </span>
                {totalQtyFromActualProduct(editContext.actualProduct) > 0 ? (
                  <span className="ml-2 text-amber-700">
                    · Qty {totalQtyFromActualProduct(editContext.actualProduct)}
                  </span>
                ) : null}
              </p>
              {(editContext?.actualProduct?.variants?.length > 0 ||
                editContext?.actualVariantRows?.length > 0) ? (
                <ul className="mt-1 max-h-28 overflow-y-auto rounded border border-amber-100 bg-white/80 divide-y divide-amber-100">
                  {(editContext.actualProduct?.variants?.length
                    ? editContext.actualProduct.variants
                    : actualProductToDisplayRows({ sku: editContext.actualSku, variants: editContext.actualVariantRows })
                  ).map((row, idx) => (
                    <li key={row.sku ?? row.skuId ?? idx} className="flex justify-between gap-2 px-2 py-1.5 text-[10px]">
                      <span className="truncate">{row.label || `SKU ${row.sku ?? row.skuId}`}</span>
                      <span className="shrink-0 font-mono text-amber-900">
                        ×{row.quantity ?? row.selectedQuantity ?? row.qty ?? 1}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-amber-700">No actual variant lines stored yet.</p>
              )}
              <p className="text-amber-800">
                Search a cheaper seller SKU below. Buying SKU and variant quantities are saved separately.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 [&_label_p]:text-[11px]">
              <Input
                label={isBuying || isEdit ? 'Buying SKU / offer' : 'Importerr SKU'}
                name="manualSku"
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value)}
                disabled={skuFieldLocked}
                placeholder="Enter SKU and search"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="px-2 py-1.5 text-xs placeholder:text-gray-400 sm:text-xs"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={skuFieldLocked}
              loading={searching}
              startIcon={<Search className="h-4 w-4" />}
              onClick={handleSearch}
            >
              Search
            </Button>
          </div>

          {error ? <p className="text-[11px] text-red-600">{error}</p> : null}

          {product ? (
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50/80 to-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => productImages[0] && openGallery(0)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (productImages[0]) openGallery(0);
                    }
                  }}
                  className="relative shrink-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:ring-2 hover:ring-violet-300"
                >
                  {product.imgUrl?.[0] ? (
                    <img
                      src={product.imgUrl[0]}
                      alt=""
                      className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center text-gray-400 sm:h-28 sm:w-28">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                  {productImages.length > 1 ? (
                    <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      +{productImages.length - 1}
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold leading-snug text-gray-900">{product.title || '—'}</p>
                  <p className="text-[11px] text-gray-500">
                    SKU: <span className="font-mono text-gray-700">{product.sku || '—'}</span>
                    {product.offerId ? (
                      <>
                        {' '}
                        · Offer: <span className="font-mono text-gray-700">{product.offerId}</span>
                      </>
                    ) : null}
                  </p>

                  {productImages.length > 0 ? (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Product images
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {productImages.slice(0, 8).map((url, idx) => (
                          <div
                            key={`${url}-${idx}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => openGallery(idx)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openGallery(idx);
                              }
                            }}
                            className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:border-violet-300 hover:ring-2 hover:ring-violet-200"
                          >
                            <ImagePreview
                              src={url}
                              alt=""
                              className="h-10 w-10"
                              thumbnailClassName="rounded-md"
                              hoverPreview
                              previewSize={240}
                            />
                          </div>
                        ))}
                        {productImages.length > 8 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            startIcon={<Images className="h-4 w-4" />}
                            onClick={() => openGallery(0)}
                          >
                            View all ({productImages.length})
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            startIcon={<Images className="h-4 w-4" />}
                            onClick={() => openGallery(0)}
                          >
                            Slideshow
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Variants</p>
                {variations.length === 0 ? (
                  <p className="text-[11px] text-gray-600">No variants on this product.</p>
                ) : (
                  <div className="max-h-[min(420px,55vh)] space-y-1.5 overflow-y-auto pr-1">
                    {variations.map((v) => {
                      const sid = v.skuId;
                      const on = Boolean(included[sid]);
                      const thumb = variationThumb(v);
                      const price = variationPrice(v);
                      const qty = qtyBySkuId[sid] ?? 1;
                      const label = mapImporterrVariationToLeadVariant(v).label;
                      return (
                        <div
                          key={sid}
                          className={`flex flex-col gap-2 rounded-lg border p-2 transition sm:flex-row sm:items-center ${
                            on
                              ? 'border-gray-200 bg-white shadow-sm'
                              : 'border-gray-100 bg-gray-100/80 opacity-70'
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleIncluded(sid)}
                              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-violet-600"
                            />
                            <ImagePreview
                              src={thumb}
                              alt={label}
                              className="h-12 w-12 shrink-0 rounded-md border border-gray-200 bg-white"
                              thumbnailClassName="rounded-md"
                              hoverPreview
                              previewSize={240}
                              fallbackIcon={<Package className="h-5 w-5" />}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium leading-tight text-gray-900">{label}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-gray-500">SKU ID {sid}</p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end">
                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-wide text-gray-500">Unit</p>
                              <p className="text-[11px] font-semibold tabular-nums text-gray-900">
                                {formatCurrency(price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-0.5">
                              <button
                                type="button"
                                disabled={!on || qty <= 1}
                                onClick={() => bumpQty(sid, -1)}
                                className="flex h-7 w-7 items-center justify-center rounded text-gray-600 transition hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-[1.75rem] text-center text-[11px] font-semibold tabular-nums text-gray-900">
                                {qty}
                              </span>
                              <button
                                type="button"
                                disabled={!on}
                                onClick={() => bumpQty(sid, 1)}
                                className="flex h-7 w-7 items-center justify-center rounded text-gray-600 transition hover:bg-white hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!product || (variations.length > 0 && selectedVariantCount === 0)}
              onClick={handleSave}
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={galleryOpen && productImages.length > 0}
        onClose={() => setGalleryOpen(false)}
        title={<h2 className="m-0 text-sm font-semibold text-gray-900">Product images</h2>}
        size="2xl"
        className="z-[100]"
      >
        <div className="relative flex min-h-[480px] flex-col text-xs">
          <div className="relative flex flex-1 items-center justify-center rounded-lg bg-slate-100/80 py-6">
            <img
              src={productImages[galleryIndex]}
              alt=""
              className="max-h-[min(76vh,720px)] max-w-full object-contain"
            />
            {productImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={galleryPrev}
                  className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-800 shadow-md transition hover:bg-violet-50 hover:text-violet-800"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={galleryNext}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-800 shadow-md transition hover:bg-violet-50 hover:text-violet-800"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-gray-100 pt-2">
            <p className="text-[11px] text-gray-500">
              {galleryIndex + 1} / {productImages.length} · Arrow keys to navigate
            </p>
          </div>
          <div className="mt-1.5 flex max-h-20 flex-wrap justify-center gap-1 overflow-y-auto">
            {productImages.map((url, idx) => (
              <button
                key={`${url}-g-${idx}`}
                type="button"
                onClick={() => setGalleryIndex(idx)}
                className={`overflow-hidden rounded border-2 bg-white p-0.5 transition ${
                  idx === galleryIndex ? 'border-violet-500 ring-1 ring-violet-200' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={url} alt="" className="h-10 w-10 object-contain" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddManualProductModal;

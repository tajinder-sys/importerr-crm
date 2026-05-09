import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../common/Card';
import { formatCurrency, formatDateIndian } from '../../../utils/helpers';
import { UiSectionTitle } from '../../common/ui/Typography';
import QuotePriceWithBreakdown from './QuotePriceWithBreakdown';
import EmptyState from '../../common/ui/EmptyState';
import CopyText from '../../common/ui/CopyText';
import api, { IMPORTERR_URL } from '../../../utils/api';
import { API_ROUTES } from '../../../utils/apiRoutes';
import VariantsList from '../../common/VariantsList';

const SectionLabel = ({ children }) => (
  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-2">
    {children}
  </p>
);

const Pill = ({ children, color = 'blue' }) => {
  const styles = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-green-50 text-green-800',
    yellow: 'bg-yellow-50 text-yellow-800',
    red: 'bg-red-50 text-red-800',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[color]}`}>
      {children}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = { draft: 'yellow', sent: 'blue', accepted: 'green', rejected: 'red' };
  return <Pill color={map[status] || 'blue'}>{status}</Pill>;
};

// ─── History Accordion Item ───────────────────────────────────────────────────

const HistoryItem = ({ h, index, total, lead, pricePerUnit }) => {
  const [open, setOpen] = useState(false);
  const historyQty = h.variants?.reduce((acc, v) => acc + v.selectedQuantity, 0);

  const historyPricePerUnit = (() => {
    if (!h.variants?.length) return pricePerUnit;
    const qty = h.variants.reduce((acc, v) => acc + v.selectedQuantity, 0);
    return qty ? h.amounts.finalPrice / qty : 0;
  })();

  const sourceVariants = lead?.variants;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">

      {/* Accordion header — always visible */}
      <button
        className="w-full text-left px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Pill color="blue">Revision {total - index}</Pill>
          <span className="text-xs text-slate-400 truncate">
            {formatDateIndian(h.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Price summary inline */}
          <div className="text-right">
            <QuotePriceWithBreakdown
              price={h.amounts.finalPrice}
              discountPercent={h.amounts.discountPercent}
              initialUnitPrice={h.amounts.initialUnitPrice}
              breakdown={h.pricing?.updatedBreakDown}
              originalBreakdown={h.pricing?.originalBreakDown}
              showDiscount={false}
              totalQuantity={historyQty}   // ← add
            />
          </div>

          {h.amounts.discountPercent > 0 && (
            <span className="text-[10px] font-medium text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              −{h.amounts.discountPercent}%
            </span>
          )}

          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          }
        </div>
      </button>

      {/* Accordion body */}
      {open && (
        <div className="border-t border-slate-100">

          {/* Pricing detail row */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 mb-0.5">Final price</p>
              <p className="text-sm font-semibold text-slate-900">
                <QuotePriceWithBreakdown
                  price={h.amounts.finalPrice}
                  discountPercent={h.amounts.discountPercent}
                  initialUnitPrice={h.amounts.initialUnitPrice}
                  breakdown={h.pricing?.updatedBreakDown}
                  originalBreakdown={h.pricing?.originalBreakDown}
                  showDiscount={false}
                  totalQuantity={historyQty}   // ← add
                />
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 mb-0.5">Discount</p>
              <p className="text-xs font-medium text-green-600">{h.amounts.discountPercent}%</p>
            </div>
            {h.amounts.savedAmount > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">Saved</p>
                <p className="text-xs font-medium text-green-600">
                  {formatCurrency(h.amounts.savedAmount)}
                </p>
              </div>
            )}
          </div>

          {/* Variants for this revision */}
          {h.variants?.length > 0 ? (
            <VariantsList
              variants={h.variants}
              sourceVariants={sourceVariants}
              safeUnitPrice={historyPricePerUnit}
            />
          ) : (
            <p className="text-xs text-slate-400 px-3.5 py-3 italic">
              No variant data for this revision.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const QuotesTab = ({ lead, showError }) => {
  const [quote, setQuote] = useState(null);

  const fetchQuote = useCallback(async () => {
    if (!lead?._id) return;
    try {
      const { data } = await api.get(API_ROUTES.quote.get(lead._id));
      setQuote(data || null);
    } catch (err) {
      showError(err?.message || 'Failed to fetch quote');
    }
  }, [lead?.userId, showError]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  if (!quote) {
    return (
      <Card className="rounded-b-2xl rounded-t-none border-slate-200 shadow-sm">
        <CardHeader className="flex items-center justify-between">
          <UiSectionTitle>Quotes</UiSectionTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No quotes yet"
            description="Create and send a quote to get started"
          />
        </CardContent>
      </Card>
    );
  }

  const totalQuantity = quote.variants.reduce((acc, v) => acc + v.selectedQuantity, 0);
  const pricePerUnit = quote?.amounts?.finalPrice / totalQuantity;

  return (
    <Card className="rounded-b-2xl rounded-t-none border-slate-200 shadow-sm">
      <CardHeader className="flex items-center justify-between">
        <UiSectionTitle>Quotes</UiSectionTitle>
        <StatusBadge status={quote.status} />
      </CardHeader>

      <CardContent className="space-y-5">

        {/* ── Current quote card ── */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2 my-2 flex-wrap justify-between">
            <p className="text-xs text-slate-400">
              {quote.referenceId} • {formatDateIndian(quote.updatedAt ?? quote.createdAt)}
            </p>
            <p className="text-xs text-slate-400 flex gap-2 items-center">
              {IMPORTERR_URL}/quote/{quote.referenceId}
              <CopyText text={`${window.location.origin}/quote/${quote.referenceId}`} />
            </p>
          </div>

          <div className="flex items-center justify-between">
            <QuotePriceWithBreakdown
              price={quote.amounts.finalPrice}
              discountPercent={quote.amounts.discountPercent}
              initialUnitPrice={quote.amounts.initialUnitPrice}
              breakdown={quote.pricing.updatedBreakDown}
              showDiscount={false}
              originalBreakdown={quote.pricing.originalBreakDown}
              totalQuantity={totalQuantity}
            />
            <div className="text-right">
              <p className="text-[11px] text-green-600">{quote.amounts.discountPercent}% discount</p>
            </div>
          </div>
        </div>

        {/* ── Current variants ── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <VariantsList
            variants={quote.variants}
            sourceVariants={lead?.variants}
            safeUnitPrice={pricePerUnit}
          />
        </div>

        {/* ── History accordion ── */}
        {quote.history?.length > 0 && (
          <div>
            <SectionLabel>History</SectionLabel>
            <div className="space-y-2">
              {quote.history.map((h, i) => (
                <HistoryItem
                  key={i}
                  h={h}
                  index={i}
                  total={quote.history.length}
                  lead={lead}
                  pricePerUnit={pricePerUnit}
                />
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default QuotesTab;
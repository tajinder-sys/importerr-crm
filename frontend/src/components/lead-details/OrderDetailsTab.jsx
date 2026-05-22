import { useCallback, useEffect, useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  AlertCircle,
  ShoppingBag,
  MapPin,
  Hash,
  Receipt,
  User,
  Phone,
  Building2,
  TicketCheck,
  Wallet,
  BadgeIndianRupee,
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import Skeleton from '../common/ui/Skeleton';

// ─── Status config ────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES = {
  pending:    'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  processing: 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  packed:     'bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  shipped:    'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  delivered:  'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled:  'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded:   'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

// Maps raw orderStatus[].status strings → tracker step keys
const STATUS_TO_STEP = {
  'order created': 'placed',
  'processing':    'processing',
  'packed':        'packed',
  'shipped':       'shipped',
  'delivered':     'delivered',
};

const TRACKER_STEPS = [
  { key: 'placed',     label: 'Order placed',  icon: ShoppingBag },
  { key: 'processing', label: 'Processing',    icon: CheckCircle2 },
  { key: 'packed',     label: 'Packed',        icon: Package },
  { key: 'shipped',    label: 'Shipped',       icon: Truck },
  { key: 'delivered',  label: 'Delivered',     icon: MapPin },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Normalise raw order object into a flat, predictable shape
function normaliseOrder(raw) {
  if (!raw) return null;

  // Items — from orderDetails[]
  const items = (raw.orderDetails ?? []).map((od) => ({
    _id:       od._id,
    orderItemId: od.orderItemId,
    sku:       od.sku ?? od.product?.sku,
    name:      od.product?.title ?? 'Product',
    imageUrl:  od.product?.imgUrl?.[0] ?? null,
    quantity:  od.quantity ?? od.variant?.quantity ?? 1,
    unitPrice: od.variant?.finalPrice ?? od.consumerPrice ?? 0,
    mrp:       od.product?.mrp ?? od.variant?.finalPriceMRP ?? null,
    color:     od.variant?.skuAttributes?.find(a => a.attributeNameTrans === 'Color')?.valueTrans ?? null,
    weight:    od.variant?.weight ?? null,
  }));

  // Tracker steps — from orderStatus[]
  const trackerSteps = (raw.orderStatus ?? []).map((s) => ({
    key:       STATUS_TO_STEP[s.status?.toLowerCase()] ?? s.status?.toLowerCase(),
    label:     s.status,
    timestamp: s.date,
  }));
  const completedStepKeys = new Set(trackerSteps.map((s) => s.key));

  // Payment methods used
  const pb = raw.paymentBreakdown ?? {};
  const paymentMethods = [
    pb.razorpay?.amount   > 0 && { label: 'Razorpay',      amount: pb.razorpay.amount,   id: pb.razorpay.orderId },
    pb.ccavenue?.amount   > 0 && { label: 'CCAvenue',      amount: pb.ccavenue.amount,   id: pb.ccavenue.orderId },
    pb.wallet?.amount     > 0 && { label: 'Wallet',         amount: pb.wallet.amount },
    pb.bankTransfer?.amount > 0 && { label: 'Bank transfer', amount: pb.bankTransfer.amount },
    pb.imPoints?.amount   > 0 && { label: 'IM Points',      amount: pb.imPoints.amount,   points: pb.imPoints.pointsUsed },
  ].filter(Boolean);

  const transactionId =
    typeof raw.transactionId === 'object'
      ? raw.transactionId?.transactionId
      : raw.transactionId;

  return {
    _id:             raw._id,
    orderId:         raw.orderId,
    upsaleoOrderId:  raw.upsaleoOrderId,
    marketplace:     raw.marketplace,
    status:          raw.status ?? 'pending',
    financialStatus: raw.mkp_financial_status,
    orderDate:       raw.orderDate ?? raw.createdAt,
    paidDate:        raw.paidDate,

    // Financials
    subtotal:          raw.mkp_current_subtotal_price,
    tax:               raw.mkp_current_total_tax,
    shippingCharge:    raw.totalShippingCharges,
    gstOnShipping:     raw.gstOnShipping,
    totalDiscounts:    raw.totalDiscounts,
    procurementCharges:raw.procurementCharges,
    total:             raw.mkp_current_total_price ?? raw.totalPrice,
    receivedPrice:     raw.mkp_current_received_price,
    amountPayable:     raw.amountPayableAfterImPoints,
    refunded:          raw.refunded,

    // Items
    items,

    // Tracker
    trackerSteps,
    completedStepKeys,

    // Payment
    paymentMethods,
    transactionId,

    // Ticket
    ticket:   raw.ticket,
    ticketId: raw.ticketId,
    ticketDate: raw.ticketDate,

    // Addresses
    shipping: {
      name:    raw.recipientName,
      phone:   raw.shippingPhoneNumber,
      line1:   raw.shippingAddress1,
      line2:   raw.shippingAddress2,
      line3:   raw.shippingAddress3,
      city:    raw.shippingCity,
      state:   raw.shippingState,
      pincode: raw.shippingPostalCode,
    },
    billing: raw.useSameAddressForBilling ? null : {
      name:    raw.billingName,
      phone:   raw.billingPhone,
      line1:   raw.billingAddress1,
      line2:   raw.billingAddress2,
      line3:   raw.billingAddress3,
      city:    raw.billingCity,
      state:   raw.billingState,
      pincode: raw.billingPostalCode,
    },

    // Seller
    seller: raw.sellerId,

    // Misc
    shippingMethod:    raw.shippingMethod,
    customerNote:      raw.customerNote,
  };
}

// ─── Tiny primitives ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={cn('px-4 py-4 border-b border-slate-100 dark:border-slate-700 last:border-b-0', className)}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function StatCell({ label, value, valueClassName = '', sub = null }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={cn('text-[15px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums', valueClassName)}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function InfoChip({ label, value, mono = false, className = '' }) {
  return (
    <div className={cn('rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5', className)}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className={cn('text-[12px] font-medium text-slate-800 dark:text-slate-200 break-all', mono && 'font-mono')}>
        {value || '—'}
      </p>
    </div>
  );
}

// ─── Order items ──────────────────────────────────────────────────────────────

function OrderItemRow({ item }) {
  const subtotal = item.unitPrice * item.quantity;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-b-0">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-12 w-12 rounded-lg object-cover border border-slate-100 dark:border-slate-700 flex-shrink-0"
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <Package className="h-5 w-5 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
          {item.name}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {item.sku       && <span>SKU: {item.sku}</span>}
          {item.color     && <span>{item.color}</span>}
          {item.weight    && <span>{item.weight} kg</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="rounded bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            Qty {item.quantity}
          </span>
          <span className="text-[11px] text-slate-400">× {formatINR(item.unitPrice)}</span>
          {item.mrp && item.mrp > item.unitPrice && (
            <span className="text-[10px] line-through text-slate-400">{formatINR(item.mrp)}</span>
          )}
        </div>
      </div>
      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 shrink-0 tabular-nums">
        {formatINR(subtotal)}
      </p>
    </div>
  );
}

// ─── Shipment tracker ─────────────────────────────────────────────────────────

function ShipmentTracker({ completedStepKeys, trackerSteps }) {
  const completedList = TRACKER_STEPS.filter((s) => completedStepKeys.has(s.key));
  const lastCompletedIdx = TRACKER_STEPS.reduce(
    (acc, s, i) => (completedStepKeys.has(s.key) ? i : acc), -1,
  );

  return (
    <div>
      {TRACKER_STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done    = idx < lastCompletedIdx;
        const active  = idx === lastCompletedIdx;
        const pending = idx > lastCompletedIdx;
        const stepData = trackerSteps.find((s) => s.key === step.key);
        const isLast = idx === TRACKER_STEPS.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                done   && 'bg-emerald-500',
                active && 'bg-indigo-500',
                pending && 'bg-slate-200 dark:bg-slate-600',
              )}>
                <Icon className="h-3 w-3 text-white" strokeWidth={2.5} />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-px flex-1 my-1 transition-colors',
                    done || active
                      ? 'bg-emerald-300 dark:bg-emerald-700'
                      : 'bg-slate-200 dark:bg-slate-700',
                  )}
                  style={{ minHeight: 18 }}
                />
              )}
            </div>
            <div className={cn('pb-3 min-w-0', isLast && 'pb-0')}>
              <p className={cn(
                'text-[12px] font-medium',
                pending ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200',
              )}>
                {step.label}
                {active && (
                  <span className="ml-2 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
                    Current
                  </span>
                )}
              </p>
              {stepData?.timestamp && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {formatDateTime(stepData.timestamp)}
                </p>
              )}
              {!stepData?.timestamp && pending && (
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">Pending</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Address block ────────────────────────────────────────────────────────────

function AddressBlock({ addr, title }) {
  if (!addr) return <p className="text-[12px] text-slate-400">—</p>;
  return (  
    <div className="rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-[12px] text-slate-700 dark:text-slate-300 space-y-0.5">
      {title && <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>}
      <p className="pt-0.5">
        {[addr.line1, addr.line2, addr.line3].filter(Boolean).join(', ')}
      </p>
      <p>{[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</p>
      {addr.name  && <p className="font-semibold text-slate-900 dark:text-slate-100">{addr.name}</p>}
      {addr.phone && (
        <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Phone className="h-3 w-3" />{addr.phone}
        </p>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="space-y-3 p-4 animate-pulse">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * OrderDetailsTab — loads order from Importerr by upsaleoOrderId (preferred) or importerOrderId.
 */
export default function OrderDetailsTab({
  importerOrderId,
  onError,
}) {
  const fetchId =  importerOrderId;
  const [loading, setLoading] = useState(true);
  const [order, setOrder]     = useState(null);

  const fetchOrder = useCallback(async () => {
    if (!fetchId) return;
    setLoading(true);
    try {
      const { data } = await api.get(API_ROUTES.importerr.orderById(fetchId));
      setOrder(normaliseOrder(data?.order ?? data));
    } catch (err) {
      onError?.(err?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [fetchId, onError]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  if (loading) return <OrderSkeleton />;

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Order not found</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {`Importerr: ${importerOrderId || fetchId}`}
        </p>
      </div>
    );
  }

  const statusStyle = ORDER_STATUS_STYLES[order.status?.toLowerCase()] ?? ORDER_STATUS_STYLES.pending;

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              Order #{order.orderId}
            </h2>
            {order.upsaleoOrderId && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {order.upsaleoOrderId}
              </span>
            )}
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
              statusStyle,
            )}>
              <Truck className="h-2.5 w-2.5" />
              {order.status}
            </span>
            {order.financialStatus && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                order.financialStatus?.toLowerCase() === 'paid'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
              )}>
                <BadgeIndianRupee className="h-2.5 w-2.5" />
                {order.financialStatus}
              </span>
            )}
            {order.ticket && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                <TicketCheck className="h-2.5 w-2.5" />
                Ticket raised
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {order.marketplace && <span className="mr-2">{order.marketplace}</span>}
            Placed {formatDate(order.orderDate)}
            {order.paidDate && ` · Paid ${formatDate(order.paidDate)}`}
            {` · ${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`}
            {order.shippingMethod && ` · ${order.shippingMethod}`}
          </p>
        </div>
        <a
          href={`/orders/${order._id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View in orders
        </a>
      </div>

      {/* ── Financial stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-700">
        <StatCell label="Order total"  value={formatINR(order.total)} />
        <StatCell
          label="Received"
          value={formatINR(order.receivedPrice)}
          valueClassName="text-emerald-700 dark:text-emerald-400"
        />
        <StatCell label="Subtotal"     value={formatINR(order.subtotal)} />
        <StatCell
          label="Tax (GST)"
          value={formatINR(order.tax)}
          sub={order.gstOnShipping ? `incl. ₹${order.gstOnShipping} on shipping` : undefined}
        />
      </div>

      {/* ── Items ─────────────────────────────────────────────────────── */}
      {order.items.length > 0 && (
        <Section title="Items" icon={Package}>
          <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden px-3">
            {order.items.map((item, i) => (
              <OrderItemRow key={item._id ?? item.sku ?? i} item={item} />
            ))}
          </div>

          {/* Price breakdown */}
          <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5 space-y-1.5">
            <div className="flex justify-between text-[12px] text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatINR(order.subtotal)}</span>
            </div>
            {order.shippingCharge != null && (
              <div className="flex justify-between text-[12px] text-slate-600 dark:text-slate-300">
                <span>Shipping{order.gstOnShipping ? ` (incl. GST ₹${order.gstOnShipping})` : ''}</span>
                <span className="tabular-nums">{formatINR(order.shippingCharge)}</span>
              </div>
            )}
            {order.procurementCharges > 0 && (
              <div className="flex justify-between text-[12px] text-slate-600 dark:text-slate-300">
                <span>Procurement charges</span>
                <span className="tabular-nums">{formatINR(order.procurementCharges)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-[12px] text-slate-600 dark:text-slate-300">
                <span>Tax (GST)</span>
                <span className="tabular-nums">{formatINR(order.tax)}</span>
              </div>
            )}
            {order.totalDiscounts > 0 && (
              <div className="flex justify-between text-[12px] text-emerald-700 dark:text-emerald-400">
                <span>Discount</span>
                <span className="tabular-nums">−{formatINR(order.totalDiscounts)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-1.5 mt-0.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
              <span>Total</span>
              <span className="tabular-nums">{formatINR(order.total)}</span>
            </div>
            {order.amountPayable != null && order.amountPayable !== order.total && (
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Payable (after IM Points)</span>
                <span className="tabular-nums">{formatINR(order.amountPayable)}</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Payment ───────────────────────────────────────────────────── */}
      <Section title="Payment" icon={CreditCard}>
        {order.transactionId && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-700/40 px-3 py-2.5">
            <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-0.5">
                Transaction ID
              </p>
              <p className="text-[12px] font-mono font-medium text-slate-800 dark:text-slate-200 break-all">
                {order.transactionId}
              </p>
            </div>
          </div>
        )}

        {order.paymentMethods.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {order.paymentMethods.map((pm, i) => (
              <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet className="h-3 w-3 text-slate-400" />
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {pm.label}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatINR(pm.amount)}
                </p>
                {pm.id && (
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5 break-all">{pm.id}</p>
                )}
                {pm.points != null && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{pm.points} pts used</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-slate-400">No payment method recorded</p>
        )}
      </Section>

      {/* ── Order timeline ─────────────────────────────────────────────── */}
      <Section title="Order timeline" icon={Truck}>
        <ShipmentTracker
          completedStepKeys={order.completedStepKeys}
          trackerSteps={order.trackerSteps}
        />
      </Section>

      {/* ── Ticket ────────────────────────────────────────────────────── */}
      {order.ticket && (
        <Section title="Support ticket" icon={TicketCheck}>
          <div className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/20 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] font-medium text-violet-900 dark:text-violet-200">
                Ticket raised
              </p>
              {order.ticketDate && (
                <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5">
                  {formatDateTime(order.ticketDate)}
                </p>
              )}
            </div>
            {order.ticketId && (
              <span className="text-[11px] font-mono text-violet-500 dark:text-violet-400">
                #{order.ticketId}
              </span>
            )}
          </div>
        </Section>
      )}
      {/* ── Addresses ─────────────────────────────────────────────────── */}
      <Section title="Addresses" icon={MapPin}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <AddressBlock addr={order.shipping} title="Shipping address" />
              {order.billing && (
                <AddressBlock addr={order.billing} title="Billing address" />
              )}
          </div>
      </Section>

    

      {/* ── Seller info ───────────────────────────────────────────────── */}
      {order.seller && (
        <Section title="Seller" icon={User}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <InfoChip label="Name"      value={`${order.seller.firstName ?? ''} ${order.seller.lastName ?? ''}`.trim()} />
            <InfoChip label="Email"     value={order.seller.email} />
            <InfoChip label="Seller ID" value={order.seller.uniqueId} mono />
          </div>
        </Section>
      )}

      {/* ── Customer note ─────────────────────────────────────────────── */}
      {order.customerNote && (
        <Section title="Customer note" icon={Receipt}>
          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {order.customerNote}
          </p>
        </Section>
      )}
    </div>
  );
}
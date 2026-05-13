import { ExternalLink, Phone, Mail, User, Calendar, MessageSquare, Clock, Layers } from 'lucide-react';
import { formatDateIndian } from '../../../utils/helpers';
import Modal from '../../../components/common/ui/Modal';

const fmtPhone = (phone) => {
  if (!phone) return '-';
  const d = String(phone).replace(/\D/g, '');
  let local = d;
  if (d.startsWith('91') && d.length >= 12) local = d.slice(2, 12);
  else if (d.length > 10) local = d.slice(-10);
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const SOURCE_CLS = {
  importerr_inquiry: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700',
  direct:            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  referral:          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
  social_media:      'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700',
  cold_call:         'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700',
};
const STATUS_CLS = {
  new:       'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-700',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
  lost:      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700',
  won:       'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
};

const Pill = ({ label, cls }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls || 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'}`}>
    {label?.replace(/_/g, ' ')}
  </span>
);

const InfoRow = ({ icon: Icon, label, value, mono = false }) => (
  value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0 dark:border-slate-700">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 dark:bg-slate-700">
        <Icon size={13} className="text-slate-500 dark:text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5 dark:text-slate-500">{label}</p>
        <p className={`text-sm text-slate-800 break-all leading-snug dark:text-slate-200 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
      </div>
    </div>
  ) : null
);

const SectionHeading = ({ children }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 mt-4 first:mt-0 dark:text-slate-500">{children}</p>
);

const VariantRow = ({ variant }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 dark:border-slate-700">
    <div className="flex items-center gap-2">
      {variant.imageUrl && (
        <img src={variant.imageUrl} alt={variant.label} className="w-8 h-8 rounded-md object-cover border border-slate-200 flex-shrink-0 dark:border-slate-600" />
      )}
      <span className="text-sm text-slate-700 font-medium dark:text-slate-300">{variant.label}</span>
    </div>
    <div className="flex items-center gap-3 text-right">
      <span className="text-[11px] text-slate-400 dark:text-slate-500">×{variant.quantity}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">₹{variant.totalPrice.toLocaleString('en-IN')}</span>
    </div>
  </div>
);

const LeadQuickViewModal = ({ lead, isOpen, onClose }) => {
  if (!lead) return null;

  const initials = (lead.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const totalValue = lead.variants?.reduce((sum, v) => sum + v.totalPrice, 0) ?? 0;

  const titleNode = (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">
        {initials}
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 leading-tight dark:text-slate-100">{lead.name}</h2>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Pill label={lead.status} cls={STATUS_CLS[lead.status]} />
          <Pill label={lead.source} cls={SOURCE_CLS[lead.source]} />
        </div>
      </div>
    </div>
  );

  const footerNode = (
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-slate-400 flex items-center gap-1 dark:text-slate-500">
        <Clock size={11} />
        Updated {formatDateIndian(lead.updatedAt)}
      </p>
      <button
        onClick={() => window.open(`/leads/${lead._id}`, '_blank', 'noopener,noreferrer')}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
      >
        View Full Details
        <ExternalLink size={13} />
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleNode} footer={footerNode} size="lg">
      <SectionHeading>Contact Information</SectionHeading>
      <div className="bg-slate-50/70 rounded-xl px-3 divide-y divide-slate-100 dark:bg-slate-700/30 dark:divide-slate-700">
        <InfoRow icon={Phone}    label="Phone"       value={fmtPhone(lead.phone)} mono />
        <InfoRow icon={Mail}     label="Email"       value={lead.email} />
        <InfoRow icon={User}     label="Assigned To" value={lead.assignedTo?.name} />
        <InfoRow icon={Layers}   label="Lead Type"   value={lead.leadType} />
        <InfoRow icon={Calendar} label="Created"     value={formatDateIndian(lead.createdAt)} />
      </div>

      {lead.message && (
        <>
          <SectionHeading>Message</SectionHeading>
          <div className="bg-slate-50/70 rounded-xl px-4 py-3 dark:bg-slate-700/30">
            <p className="text-sm text-slate-700 leading-relaxed dark:text-slate-300">{lead.message}</p>
          </div>
        </>
      )}

      {lead.variants?.length > 0 && (
        <>
          <SectionHeading>
            Order Variants
            <span className="ml-2 normal-case font-normal text-slate-500 dark:text-slate-400">
              ({lead.totalQuantity} units · ₹{totalValue.toLocaleString('en-IN')} total)
            </span>
          </SectionHeading>
          <div className="bg-slate-50/70 rounded-xl px-3 divide-y divide-slate-100 dark:bg-slate-700/30 dark:divide-slate-700">
            {lead.variants.map((v) => <VariantRow key={v.skuId} variant={v} />)}
          </div>
          <div className="flex justify-end mt-2">
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 dark:bg-indigo-900/30 dark:border-indigo-700">
              <span className="text-xs font-medium text-indigo-500 dark:text-indigo-400">Total Order Value</span>
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">₹{totalValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </>
      )}

      {lead.notes?.length > 0 && (
        <>
          <SectionHeading>Notes ({lead.notes.length})</SectionHeading>
          <div className="space-y-2">
            {lead.notes.map((note) => (
              <div key={note._id} className="bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-3 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare size={11} className="text-amber-500 dark:text-amber-400" />
                  <span className="text-[10px] text-amber-600 font-medium dark:text-amber-400">{formatDateIndian(note.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed dark:text-slate-300">{note.content}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

export default LeadQuickViewModal;

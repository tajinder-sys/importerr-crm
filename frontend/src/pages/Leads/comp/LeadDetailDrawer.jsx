import { X, Phone, Mail, User, Calendar, Tag, FileText, GitBranch, Layers } from 'lucide-react';
import { formatDateIndian } from '../../../utils/helpers';

const fmtPhone = (phone) => {
  if (!phone) return '-';
  const d = String(phone).replace(/\D/g, '');
  let local = d;
  if (d.startsWith('91') && d.length >= 12) local = d.slice(2, 12);
  else if (d.length > 10) local = d.slice(-10);
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
      <Icon size={13} className="text-slate-400" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium break-all">{value || '—'}</p>
    </div>
  </div>
);

const LeadDetailDrawer = ({ lead, onClose, onEdit }) => {
  if (!lead) return null;

  const initials = (lead.name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-96 bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200">
              {initials}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{lead.name}</h2>
              <p className="text-xs text-slate-400 capitalize mt-0.5">{lead.leadType || 'lead'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(lead)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all ml-1"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Status + Source badges */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            lead.status === 'new' ? 'bg-sky-50 text-sky-700 border-sky-200'
            : lead.status === 'contacted' ? 'bg-amber-50 text-amber-700 border-amber-200'
            : lead.status === 'qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : lead.status === 'won' ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {lead.status?.replace(/_/g, ' ')}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-violet-50 text-violet-700 border-violet-200">
            {lead.source?.replace(/_/g, ' ')}
          </span>
          {lead.stageId?.name && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
              style={{
                backgroundColor: `${lead.stageId?.color || '#6366f1'}15`,
                color: lead.stageId?.color || '#6366f1',
                borderColor: `${lead.stageId?.color || '#6366f1'}30`,
              }}
            >
              {lead.stageId.name}
            </span>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Contact info section */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Contact Info</p>
          <div className="mb-5">
            <Row icon={Phone}    label="Phone"       value={fmtPhone(lead.phone)} />
            <Row icon={Mail}     label="Email"       value={lead.email} />
            <Row icon={User}     label="Assigned To" value={lead.assignedTo?.name} />
            <Row icon={Calendar} label="Created"     value={formatDateIndian(lead.createdAt)} />
          </div>

          {/* Pipeline info */}
          {(lead.pipelineId || lead.stageId) && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pipeline</p>
              <div className="mb-5">
                <Row icon={GitBranch} label="Pipeline" value={lead.pipelineId?.name} />
                <Row icon={Layers}    label="Stage"    value={lead.stageId?.name} />
              </div>
            </>
          )}

          {/* Notes */}
          {lead.notes?.length > 0 && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Notes ({lead.notes.length})
              </p>
              <div className="space-y-2 mb-5">
                {lead.notes.map((note) => (
                  <div
                    key={note._id}
                    className="bg-amber-50 border border-amber-100 rounded-xl p-3"
                  >
                    <p className="text-xs text-slate-700 leading-relaxed">{note.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">{formatDateIndian(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Product info if applicable */}
          {lead.productSku && (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Product</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-5 space-y-1">
                <Row icon={Tag} label="SKU" value={lead.productSku} />
                {lead.totalQuantity && (
                  <p className="text-xs text-slate-600 font-medium">Total qty: {lead.totalQuantity}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Quick action footer */}
        <div className="border-t border-slate-100 px-5 py-3 flex gap-2 flex-shrink-0">
          <a
            href={`tel:${lead.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Phone size={12} /> Call
          </a>
          <a
            href={`mailto:${lead.email}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Mail size={12} /> Email
          </a>
          <button
            onClick={() => window.open(`/leads/${lead._id}`, '_blank', 'noopener,noreferrer')}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
          >
            Full View
          </button>
        </div>
      </div>
    </>
  );
};

export default LeadDetailDrawer;
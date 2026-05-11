import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Eye, Pencil, Phone, Mail, User, Calendar, MessageSquare } from 'lucide-react';
import { formatDateIndian } from '../../../utils/helpers';
import LeadQuickViewModal from './LeadQuickViewModal';
import LeadNotes from '../../../components/common/LeadNotes';

/* ── helpers ──────────────────────────────────────────────────── */
const fmtPhone = (phone) => {
  if (!phone) return '-';
  const d = String(phone).replace(/\D/g, '');
  let local = d;
  if (d.startsWith('91') && d.length >= 12) local = d.slice(2, 12);
  else if (d.length > 10) local = d.slice(-10);
  return local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : phone;
};

const SOURCE_CLS = {
  importerr_inquiry: 'bg-violet-50 text-violet-700 border-violet-200',
  direct:            'bg-blue-50 text-blue-700 border-blue-200',
  referral:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  social_media:      'bg-pink-50 text-pink-700 border-pink-200',
  cold_call:         'bg-orange-50 text-orange-700 border-orange-200',
};
const STATUS_CLS = {
  new:       'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:      'bg-rose-50 text-rose-700 border-rose-200',
  won:       'bg-green-50 text-green-700 border-green-200',
};

const Pill = ({ label, cls }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
    {label?.replace(/_/g, ' ')}
  </span>
);

/* ── component ────────────────────────────────────────────────── */
const LeadCard = ({
  lead,
  onEdit = () => {},
  onNotify = () => {},
}) => {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead._id,
    data: { lead },
  });

  const initials = (lead.name || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const blockDrag = (e) => e.stopPropagation();

  return (
    <>
      <div
        ref={setNodeRef}
        // ─── Smooth drag: use raw CSS transform, no Tailwind transition during drag ───
        style={{
          transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
          // GPU-composited layer — eliminates jank
          willChange: isDragging ? 'transform' : 'auto',
          // Kill transition while dragging so it tracks pointer 1:1
          transition: isDragging ? 'none' : 'box-shadow 150ms ease, border-color 150ms ease',
          // Prevent the ghost from capturing pointer events while flying
          pointerEvents: isDragging ? 'none' : undefined,
          zIndex: isDragging ? 999 : undefined,
          opacity: isDragging ? 0.92 : 1,
        }}
        {...listeners}
        {...attributes}
        className={`bg-white border rounded-xl p-3.5 group select-none touch-none ${
          isDragging
            ? 'border-indigo-300 shadow-2xl shadow-indigo-200 rotate-[1.5deg] scale-[1.03] cursor-grabbing'
            : 'border-slate-200 hover:border-indigo-200 hover:shadow-md cursor-grab active:cursor-grabbing'
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{lead.name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{lead.leadType || 'lead'}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onPointerDown={blockDrag}
          >
            <button
              onClick={() => setQuickViewOpen(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              title="Quick view lead"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => onEdit(lead)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
              title="Edit lead"
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        {/* Contact details */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Phone size={10} className="text-slate-400 flex-shrink-0" />
            <span className="font-medium truncate">{fmtPhone(lead.phone)}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Mail size={10} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.assignedTo?.name && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <User size={10} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{lead.assignedTo.name}</span>
            </div>
          )}
        </div>

        {/* Message */}
        {lead.message && (
          <div className="flex items-start gap-2 mb-3 bg-slate-50 rounded-lg px-2.5 py-2">
            <MessageSquare size={10} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{lead.message}</p>
          </div>
        )}

        {/* Pills */}
        <div className="flex flex-wrap gap-1 mb-3">
          <Pill label={lead.source} cls={SOURCE_CLS[lead.source]} />
          <Pill label={lead.status} cls={STATUS_CLS[lead.status]} />
        </div>

        {/* Footer */}
        <div className="flex items-center pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Calendar size={10} />
            {formatDateIndian(lead.createdAt)}
          </div>
        </div>

        {/* Notes — block drag so interactions work */}
        <div onPointerDown={blockDrag}>
          <LeadNotes
            leadId={lead._id}
            variant="card"
            initialNotes={lead.notes || []}
            showError={(msg) => onNotify(msg, 'error')}
            showSuccess={(msg) => onNotify(msg, 'success')}
          />
        </div>
      </div>

      <LeadQuickViewModal
        lead={lead}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
};

export default LeadCard;
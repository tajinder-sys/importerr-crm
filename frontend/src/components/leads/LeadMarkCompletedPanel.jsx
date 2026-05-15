import { useState } from 'react';
import { CheckCircle2, FileCheck } from 'lucide-react';
import Button from '../common/ui/Button';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { formatDate } from '../../utils/helpers';
import MarkLeadCompletedModal from './MarkLeadCompletedModal';

export default function LeadMarkCompletedPanel({ lead, completion, onCompleted }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!lead) return null;

  if (lead.isCompleted) {
    return (
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-5 py-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <FileCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">Lead completed</p>
            {lead.completedAt ? (
              <p className="mt-0.5 text-xs text-emerald-700/90 dark:text-emerald-300/90">
                {formatDate(lead.completedAt)}
              </p>
            ) : null}
            {lead.completedNote ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-800 dark:text-emerald-200">
                {lead.completedNote}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!completion?.canMarkCompleted) {
    return null;
  }

  const handleSubmit = async (completedNote) => {
    setSubmitting(true);
    try {
      const res = await api.post(API_ROUTES.leads.complete(lead._id), { completedNote });
      if (res?.success) {
        onCompleted?.(res.data?.lead || res.data);
      } else {
        throw new Error(res?.message || 'Failed to mark as completed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-violet-200/80 bg-violet-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-violet-900/40 dark:bg-violet-950/25">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <p className="font-semibold text-violet-900 dark:text-violet-100">Final stage reached</p>
            <p className="mt-0.5 text-sm text-violet-700/90 dark:text-violet-300/90">
              Mark this lead completed when work is done. It will leave active leads and SLA tracking.
            </p>
          </div>
        </div>
        <Button
          className="shrink-0"
          startIcon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => setModalOpen(true)}
        >
          Mark as completed
        </Button>
      </div>

      <MarkLeadCompletedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </>
  );
}

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '../common/ui/Button';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import MarkLeadCompletedModal from './MarkLeadCompletedModal';

/**
 * Compact “Mark as completed” for kanban cards (last stage only).
 */
export default function LeadMarkCompletedButton({
  lead,
  isLastStage = false,
  onCompleted,
  onNotify,
  className = '',
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!lead || lead.isCompleted || !isLastStage) {
    return null;
  }

  const handleSubmit = async (completedNote) => {
    setSubmitting(true);
    try {
      const res = await api.post(API_ROUTES.leads.complete(lead._id), { completedNote });
      if (res?.success) {
        onNotify?.('Lead marked as completed', 'success');
        setModalOpen(false);
        onCompleted?.(lead._id);
      } else {
        throw new Error(res?.message || 'Failed to mark as completed');
      }
    } catch (err) {
      onNotify?.(err?.message || 'Failed to mark as completed', 'error');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`mt-2 border-t border-slate-100 pt-2 dark:border-slate-700 ${className}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full justify-center border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
          startIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
          onClick={() => setModalOpen(true)}
        >
          Mark as completed
        </Button>
      </div>

      <MarkLeadCompletedModal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </>
  );
}

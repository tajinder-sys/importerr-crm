import { Mail } from 'lucide-react';
import Modal from '../common/ui/Modal';
import Button from '../common/ui/Button';
import Skeleton from '../common/ui/Skeleton';

const QuoteEmailPreviewModal = ({
  isOpen,
  onClose,
  preview,
  isLoading,
  isSending,
  onSend,
  leadEmail,
}) => {
  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onClose} disabled={isSending}>
        Cancel
      </Button>
      <Button
        size="sm"
        variant="primary"
        onClick={onSend}
        disabled={isLoading || isSending || !preview?.body}
        startIcon={<Mail className="h-3.5 w-3.5" />}
      >
        {isSending ? 'Sending…' : 'Send quote & email'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quote email preview"
      size="xl"
      panelClassName="max-w-3xl"
      footer={footer}
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : preview?.body ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800/80">
            <p className="text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">To:</span>{' '}
              {preview.to || leadEmail || '—'}
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">Subject:</span>{' '}
              {preview.subject || '—'}
            </p>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Message preview
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900">
            <iframe
              title="Quote email preview"
              srcDoc={preview.body}
              className="block h-[min(520px,60vh)] w-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The quote link in the preview is placeholder until send. Product and variant details match
            what the customer will receive.
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Could not load email preview. Try again.</p>
      )}
    </Modal>
  );
};

export default QuoteEmailPreviewModal;

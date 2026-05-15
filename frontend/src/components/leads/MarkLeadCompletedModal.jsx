import { useState } from 'react';
import Modal from '../common/ui/Modal';
import Button from '../common/ui/Button';
export default function MarkLeadCompletedModal({ isOpen, onClose, onSubmit, loading = false }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    if (loading) return;
    setNote('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) {
      setError('Completion note is required');
      return;
    }
    setError('');
    try {
      await onSubmit(trimmed);
      setNote('');
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to mark as completed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mark lead as completed"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={loading}>
            Mark completed
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This lead is on the final stage of its pipeline. Add a required note before closing it out.
          Completed leads move to the Completed Leads page and are excluded from SLA alerts.
        </p>
        <div>
          <label htmlFor="completedNote" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Completion note <span className="text-red-500">*</span>
          </label>
          <textarea
            id="completedNote"
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError('');
            }}
            placeholder="Summarize outcome, handoff, or closure details…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            disabled={loading}
          />
          {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
      </form>
    </Modal>
  );
}

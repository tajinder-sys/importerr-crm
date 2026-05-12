import { useState, useCallback, useEffect } from 'react';
import { Pencil, Trash2, MessageSquare, Plus, ChevronDown, ChevronUp } from 'lucide-react';

import Button from './ui/Button';
import Modal from './ui/Modal';
import api from '../../utils/api';
import { Card, CardContent, CardHeader } from './ui/Card';
import { UiSectionTitle } from './ui/Typography';
import { useAuth } from '../../hooks/useAuth';
import ConfirmDialog from './ui/ConfirmDialog';

/* ─────────────────────────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────────────────────────── */
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateShort = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/* ─────────────────────────────────────────────────────────────────
   Card variant — compact inline notes strip
───────────────────────────────────────────────────────────────── */
const CardVariant = ({ notes, notesLoading, onAdd, onEdit, onDelete, deletingNoteId, canDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const visibleNotes = expanded ? notes : notes.slice(0, 2);

  return (
    <div className="mt-2 pt-2 border-t border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <MessageSquare size={10} />
          Notes {notes.length > 0 && `(${notes.length})`}
          {notes.length > 2 && (
            expanded
              ? <ChevronUp size={10} className="ml-0.5" />
              : <ChevronDown size={10} className="ml-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded px-1.5 py-0.5 transition-colors"
        >
          <Plus size={10} />
          Add
        </button>
      </div>

      {/* Notes list */}
      {notesLoading ? (
        <div className="space-y-1">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-[10px] text-slate-400 italic py-1">No notes yet</p>
      ) : (
        <div className="space-y-1">
          {visibleNotes.map((note) => {
            const isEdited = note.updatedAt && note.createdAt && note.updatedAt !== note.createdAt;
            return (
              <div
                key={note._id}
                className="group/note flex items-start gap-1.5 bg-amber-50/70 border border-amber-100 rounded-lg px-2 py-1.5"
              >
                {/* Avatar dot */}
                <div className="w-4 h-4 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5">
                  {note.createdBy?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-2 break-words">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-slate-400">{formatDateShort(note.createdAt)}</span>
                    {isEdited && <span className="text-[9px] text-amber-500">· edited</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(note); }}
                    className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(note._id); }}
                      disabled={deletingNoteId === note._id}
                      className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Collapse / expand toggle */}
          {notes.length > 2 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
              className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 py-0.5 transition-colors"
            >
              {expanded ? 'Show less' : `+${notes.length - 2} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Page variant — full Card design (existing)
───────────────────────────────────────────────────────────────── */
const PageVariant = ({ notes, notesLoading, onAdd, onEdit, onDelete, deletingNoteId, canDelete }) => (
  <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm">
    <CardHeader className="border-gray-100 flex items-center justify-between">
      <UiSectionTitle>Notes</UiSectionTitle>
      <Button size="sm" onClick={onAdd} className="flex items-center gap-2">
        Add Note
      </Button>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-4">
        {notesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse rounded-xl border border-gray-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded bg-gray-200 mb-1" />
                    <div className="h-2.5 w-40 rounded bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
            <MessageSquare className="h-7 w-7 text-gray-300 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-700">No notes yet</h4>
            <p className="text-xs text-gray-500 mt-1">Add your first note</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => {
              const isEdited = note.updatedAt && note.createdAt && note.updatedAt !== note.createdAt;
              return (
                <div
                  key={note._id}
                  className="group rounded-xl border border-gray-200 bg-white px-3 py-2 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {note.createdBy?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800">{note.createdBy?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</span>
                        {isEdited && (
                          <>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-amber-600">edited</span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-gray-700 whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEdit(note)}
                        className="p-1 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(note._id)}
                          disabled={deletingNoteId === note._id}
                          className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const LeadNotes = ({ leadId, variant = 'page', showError, showSuccess, initialNotes = []}) => {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin';

  const [notes, setNotes] = useState(initialNotes);
  const [notesLoading, setNotesLoading] = useState(false);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState(null);

  const [addingNote, setAddingNote] = useState(false);
  const [updatingNote, setUpdatingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  /* fetch */
  const fetchNotes = useCallback(async () => {
    if (!leadId) return;
    try {
      setNotesLoading(true);
      const response = await api.get(`/leads/${leadId}/notes`);
      setNotes(response?.data?.data?.notes || response?.data?.notes || []);
    } catch (err) {
      showError?.(err?.message || 'Failed to fetch notes');
    } finally {
      setNotesLoading(false);
    }
  }, [leadId, showError]);

  useEffect(() => { if (variant !== 'card') fetchNotes(); }, [fetchNotes]);

  /* add */
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) { showError?.('Note content is required'); return; }
    try {
      setAddingNote(true);
      const response = await api.post(`/leads/${leadId}/notes`, { content: newNoteContent.trim() });
      const created = response?.data?.data || response?.data?.note || response?.data;
      setNotes((prev) => [created, ...prev]);
      setNewNoteContent('');
      setShowAddModal(false);
      showSuccess?.('Note added successfully');
    } catch (err) {
      showError?.(err?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  /* update */
  const handleUpdateNote = async () => {
    if (!editingNote?.content?.trim()) { showError?.('Note content is required'); return; }
    try {
      setUpdatingNote(true);
      const response = await api.put(`/leads/${leadId}/notes/${editingNote._id}`, { content: editingNote.content.trim() });
      const updated = response?.data?.data || response?.data?.note || response?.data;
      setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
      setEditingNote(null);
      setShowEditModal(false);
      showSuccess?.('Note updated successfully');
    } catch (err) {
      showError?.(err?.message || 'Failed to update note');
    } finally {
      setUpdatingNote(false);
    }
  };

  const openEditModal = (note) => {
    setEditingNote({ _id: note._id, content: note.content });
    setShowEditModal(true);
  };

  const closeAddModal = () => { setShowAddModal(false); setNewNoteContent(''); };
  const closeEditModal = () => { setShowEditModal(false); setEditingNote(null); };

  // Custom confirmation modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState(null);

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!noteToDeleteId) return;
    
    try {
      await api.delete(`/leads/${leadId}/notes/${noteToDeleteId}`);
      setNotes((prev) => prev.filter((n) => n._id !== noteToDeleteId));
      showSuccess?.('Note deleted successfully');
      setShowDeleteConfirmModal(false);
      setNoteToDeleteId(null);
    } catch (err) {
      showError?.(err?.message || 'Failed to delete note');
    }
  };

  const openDeleteConfirmModal = (noteId) => {
    setNoteToDeleteId(noteId);
    setShowDeleteConfirmModal(true);
  };

  const closeDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    setNoteToDeleteId(null);
  };

  const sharedProps = {
    notes,
    notesLoading,
    onAdd: () => setShowAddModal(true),
    onEdit: openEditModal,
    onDelete: openDeleteConfirmModal, // Use custom modal instead of direct delete
    deletingNoteId,
    canDelete,
  };

  return (
    <>
      {variant === 'card'
        ? <CardVariant {...sharedProps} />
        : <PageVariant {...sharedProps} />
      }

      {/* ── Add Note Modal ── */}
      <Modal isOpen={showAddModal} onClose={closeAddModal} title="Add Note" size="md">
        <form
          className="space-y-5"
          onSubmit={(e) => { e.preventDefault(); handleAddNote(); }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note Content</label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={5}
              placeholder="Write your note here..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeAddModal}>Cancel</Button>
            <Button type="submit" loading={addingNote} disabled={!newNoteContent.trim()}>Add Note</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Note Modal ── */}
      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Note" size="md">
        <form
          className="space-y-5"
          onSubmit={(e) => { e.preventDefault(); handleUpdateNote(); }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Update Note</label>
            <textarea
              value={editingNote?.content || ''}
              onChange={(e) => setEditingNote((prev) => ({ ...prev, content: e.target.value }))}
              rows={5}
              placeholder="Update note..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button type="submit" loading={updatingNote} disabled={!editingNote?.content?.trim()}>Update Note</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
          isOpen={showDeleteConfirmModal}
          onClose={closeDeleteConfirmModal}
          onConfirm={handleDeleteConfirm}
          title="Delete Note"
          message="Are you sure you want to delete this note? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          loading={!!deletingNoteId}
        />
    </>
  );
};

export default LeadNotes;
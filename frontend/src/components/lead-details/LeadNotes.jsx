import { useState, useCallback, useEffect } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  MessageSquare,
  Clock
} from 'lucide-react';

import Button from '../common/Button';
import Modal from '../common/Modal';
import api from '../../utils/api';
import { Card, CardContent, CardHeader } from '../common/Card';
import { UiSectionTitle } from '../common/ui/Typography';
import { useAuth } from '../../contexts/AuthContext';

const LeadNotes = ({ leadId, showError, showSuccess }) => {
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const {user} = useAuth();
  console.log("useruseruseruser",user)
  const [newNoteContent, setNewNoteContent] = useState('');

  const [addingNote, setAddingNote] = useState(false);
  const [updatingNote, setUpdatingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  const [editingNote, setEditingNote] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // =========================================
  // Fetch Notes
  // =========================================
  const fetchNotes = useCallback(async () => {
    if (!leadId) return;

    try {
      setNotesLoading(true);

      const response = await api.get(`/leads/${leadId}/notes`);

      const fetchedNotes =
        response?.data?.data?.notes ||
        response?.data?.notes ||
        [];

      setNotes(fetchedNotes);
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to fetch notes');
    } finally {
      setNotesLoading(false);
    }
  }, [leadId, showError]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // =========================================
  // Add Note
  // =========================================
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      showError('Note content is required');
      return;
    }

    try {
      setAddingNote(true);

      const response = await api.post(
        `/leads/${leadId}/notes`,
        {
          content: newNoteContent.trim()
        }
      );

      const createdNote =
        response?.data?.data ||
        response?.data?.note ||
        response?.data;

      setNotes(prev => [createdNote, ...prev]);

      setNewNoteContent('');
      setShowAddModal(false);

      showSuccess('Note added successfully');
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // =========================================
  // Update Note
  // =========================================
  const handleUpdateNote = async () => {
    if (!editingNote?.content?.trim()) {
      showError('Note content is required');
      return;
    }

    try {
      setUpdatingNote(true);

      const response = await api.put(
        `/leads/${leadId}/notes/${editingNote._id}`,
        {
          content: editingNote.content.trim()
        }
      );

      const updatedNote =
        response?.data?.data ||
        response?.data?.note ||
        response?.data;

      setNotes(prev =>
        prev.map(note =>
          note._id === updatedNote._id
            ? updatedNote
            : note
        )
      );

      setEditingNote(null);
      setShowEditModal(false);

      showSuccess('Note updated successfully');
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to update note');
    } finally {
      setUpdatingNote(false);
    }
  };

  // =========================================
  // Delete Note
  // =========================================
  const handleDeleteNote = async (noteId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this note?'
    );

    if (!confirmed) return;

    try {
      setDeletingNoteId(noteId);

      await api.delete(`/leads/${leadId}/notes/${noteId}`);

      setNotes(prev =>
        prev.filter(note => note._id !== noteId)
      );

      showSuccess('Note deleted successfully');
    } catch (err) {
      console.error(err);
      showError(err?.message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  // =========================================
  // Open Edit Modal
  // =========================================
  const openEditModal = (note) => {
    setEditingNote({
      _id: note._id,
      content: note.content
    });

    setShowEditModal(true);
  };

  // =========================================
  // Close Modals
  // =========================================
  const closeAddModal = () => {
    setShowAddModal(false);
    setNewNoteContent('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingNote(null);
  };

  // =========================================
  // Format Date
  // =========================================
  const formatDate = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
  <Card className="rounded-b-2xl rounded-t-none border-gray-200 shadow-sm">
    <CardHeader className="border-gray-100 flex items-center justify-between">
      <UiSectionTitle>Notes</UiSectionTitle>
       <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          Add Note
        </Button>
    </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes List */}
        <div className="space-y-4">

        {notesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-gray-200 bg-white px-3 py-2"
                >
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

              <h4 className="text-sm font-medium text-gray-700">
                No notes yet
              </h4>

              <p className="text-xs text-gray-500 mt-1">
                Add your first note
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => {
                const isEdited =
                  note.updatedAt &&
                  note.createdAt &&
                  note.updatedAt !== note.createdAt;

                return (
                  <div
                    key={note._id}
                    className="group rounded-xl border border-gray-200 bg-white px-3 py-2 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-2">

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {note.createdBy?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">

                        {/* Header */}
                        <div className="flex items-center gap-1.5 flex-wrap">

                          <span className="text-xs font-semibold text-gray-800">
                            {note.createdBy?.name || 'Unknown'}
                          </span>

                          <span className="text-[10px] text-gray-300">
                            •
                          </span>

                          <span className="text-[10px] text-gray-500">
                            {formatDate(note.createdAt)}
                          </span>

                          {isEdited && (
                            <>
                              <span className="text-[10px] text-gray-300">
                                •
                              </span>

                              <span className="text-[10px] text-amber-600">
                                edited
                              </span>
                            </>
                          )}
                        </div>

                        {/* Note */}
                        <p className="mt-1 text-xs leading-5 text-gray-700 whitespace-pre-wrap break-words">
                          {note.content}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">

                        <button
                          type="button"
                          onClick={() => openEditModal(note)}
                          className="p-1 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {user.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note._id)}
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

        {/* ========================================= */}
        {/* Add Note Modal */}
        {/* ========================================= */}
        <Modal
          isOpen={showAddModal}
          onClose={closeAddModal}
          title="Add Note"
          size="md"
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddNote();
            }}
          >

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note Content
              </label>

              <textarea
                value={newNoteContent}
                onChange={(e) =>
                  setNewNoteContent(e.target.value)
                }
                rows={5}
                placeholder="Write your note here..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeAddModal}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                loading={addingNote}
                disabled={!newNoteContent.trim()}
              >
                Add Note
              </Button>
            </div>
          </form>
        </Modal>

        {/* ========================================= */}
        {/* Edit Note Modal */}
        {/* ========================================= */}
        <Modal
          isOpen={showEditModal}
          onClose={closeEditModal}
          title="Edit Note"
          size="md"
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateNote();
            }}
          >

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Note
              </label>

              <textarea
                value={editingNote?.content || ''}
                onChange={(e) =>
                  setEditingNote(prev => ({
                    ...prev,
                    content: e.target.value
                  }))
                }
                rows={5}
                placeholder="Update note..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                loading={updatingNote}
                disabled={!editingNote?.content?.trim()}
              >
                Update Note
              </Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
};

export default LeadNotes;
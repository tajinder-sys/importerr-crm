const {
  sendSuccess,
  sendBadRequest,
  sendNotFound
} = require('../utils/responseHandler');

const Lead = require('../models/lead');
const User = require('../models/User');

// =========================
// Get Notes for Lead
// =========================
const getNotes = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const leadWithNotes = await Lead.findById(leadId)
      .populate('notes.createdBy', 'name email');

    if (!leadWithNotes) {
      return sendNotFound(res, 'Lead not found');
    }

    const notes = leadWithNotes.notes.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const total = lead ? lead.notes.length : 0;
    const startIndex = (page - 1) * limit;
    const paginatedNotes = notes.slice(startIndex, startIndex + limit);

    sendSuccess(res, 'Notes fetched successfully', {
      notes: paginatedNotes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    sendBadRequest(res, 'Failed to fetch notes');
  }
};

// =========================
// Add Note to Lead
// =========================
const addNote = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return sendBadRequest(res, 'Note content is required');
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const newNote = {
      content: content.trim(),
      createdBy: req.user.id,
      createdAt: new Date()
    };

    lead.notes.push(newNote);
    await lead.save();

    // Populate the new note with user details
    const populatedLead = await Lead.findById(leadId)
      .populate('notes.createdBy', 'name email');

    const createdNote = populatedLead.notes[populatedLead.notes.length - 1];

    sendSuccess(res, 'Note added successfully', createdNote);
  } catch (error) {
    console.error('Add note error:', error);
    sendBadRequest(res, 'Failed to add note');
  }
};

// =========================
// Update Note
// =========================
const updateNote = async (req, res) => {
  try {
    const { leadId, noteId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return sendBadRequest(res, 'Note content is required');
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const note = lead.notes.id(noteId);
    if (!note) {
      return sendNotFound(res, 'Note not found');
    }

    // Check if user is the note creator or admin
    const user = req.user;
    if (note.createdBy.toString() !== user.id && user.role !== 'admin') {
      return sendBadRequest(res, 'You can only edit your own notes');
    }

    note.content = content.trim();
    await lead.save();

    // Populate updated note with user details
    const populatedLead = await Lead.findById(leadId)
      .populate('notes.createdBy', 'name email');
    
    const updatedNote = populatedLead.notes.find(n => n._id.toString() === noteId);

    sendSuccess(res, 'Note updated successfully', updatedNote);
  } catch (error) {
    console.error('Update note error:', error);
    sendBadRequest(res, 'Failed to update note');
  }
};

// =========================
// Delete Note
// =========================
const deleteNote = async (req, res) => {
  try {
    const { leadId, noteId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return sendNotFound(res, 'Lead not found');
    }

    const note = lead.notes.id(noteId);
    if (!note) {
      return sendNotFound(res, 'Note not found');
    }

    // Check if user is the note creator or admin
    const user = req.user;
    if (note.createdBy.toString() !== user.id && user.role !== 'admin') {
      return sendBadRequest(res, 'You can only delete your own notes');
    }

    lead.notes.pull(noteId);
    await lead.save();

    sendSuccess(res, 'Note deleted successfully');
  } catch (error) {
    console.error('Delete note error:', error);
    sendBadRequest(res, 'Failed to delete note');
  }
};

module.exports = {
  getNotes,
  addNote,
  updateNote,
  deleteNote
};

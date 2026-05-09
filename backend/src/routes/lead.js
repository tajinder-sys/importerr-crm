const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addLeadCommunication,
  deleteLead,
  getLeadStatsOverview
} = require('../controllers/lead');
const { getNotes, addNote, updateNote, deleteNote } = require('../controllers/noteController');

router.get('/', auth, getLeads);
router.get('/stats/overview', auth, getLeadStatsOverview);
router.get('/:id', auth, getLeadById);
router.post('/', auth, createLead);
router.post('/:id/communications', auth, addLeadCommunication);
router.put('/:id', auth, updateLead);
router.delete('/:id', auth, authorize(['admin']), deleteLead);
router.get('/:leadId/notes', auth, getNotes);
router.post('/:leadId/notes', auth, addNote);
router.put('/:leadId/notes/:noteId', auth, updateNote);
router.delete('/:leadId/notes/:noteId', auth, authorize(['admin']), deleteNote);
module.exports = router;
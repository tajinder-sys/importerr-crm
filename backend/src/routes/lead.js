const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getLeads,
  getUnassignedLeads,
  getLeadById,
  createOrUpdateLead,
  addLeadCommunication,
  deleteLead,
  getLeadStatsOverview,
  markLeadCompletedHandler,
} = require('../controllers/lead');
const {
  getLeadStageTimer,
  getLeadStageHistory,
  overrideLeadStageSLAHandler,
  getAssignedUserDueLeadsHandler,
  getOverdueLeadsHandler,
  moveLeadToStageHandler,
} = require('../controllers/leadStageProgressController');
const { getNotes, addNote, updateNote, deleteNote } = require('../controllers/noteController');

router.get('/', auth, getLeads);
router.get('/stats/overview', auth, getLeadStatsOverview);
router.get('/unassigned', auth, authorize(['admin', 'team_manager']), getUnassignedLeads);
router.get('/due/assigned/:userId', auth, getAssignedUserDueLeadsHandler);
router.get('/overdue/team/:teamId', auth, getOverdueLeadsHandler);
router.post('/:id/complete', auth, markLeadCompletedHandler);
router.get('/:id/stage-history', auth, getLeadStageHistory);
router.get('/:id/stage-timer', auth, getLeadStageTimer);
router.patch(
  '/:leadId/stages/:stageId/sla-override',
  auth,
  authorize(['admin']),
  overrideLeadStageSLAHandler
);
router.put('/:id/stage', auth, moveLeadToStageHandler);
router.get('/:id', auth, getLeadById);
router.post('/', auth, createOrUpdateLead);
router.post('/:id/communications', auth, addLeadCommunication);
router.put('/:id', auth, createOrUpdateLead);
router.delete('/:id', auth, authorize(['admin']), deleteLead);
router.get('/:leadId/notes', auth, getNotes);
router.post('/:leadId/notes', auth, addNote);
router.put('/:leadId/notes/:noteId', auth, updateNote);
router.delete('/:leadId/notes/:noteId', auth, authorize(['admin']), deleteNote);
module.exports = router;
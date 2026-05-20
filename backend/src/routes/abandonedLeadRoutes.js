const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  listAbandonedLeads,
  getAbandonedLeadById,
  processAbandonedQueueNow,
  processAbandonedReminderBatchNow,
} = require('../controllers/abandonedLeadController');

const router = express.Router();

router.post('/process-reminder-batch', auth, adminOnly, processAbandonedReminderBatchNow);
router.post('/process-batch', auth, adminOnly, processAbandonedQueueNow);
router.get('/', auth, adminOnly, listAbandonedLeads);
router.get('/:id', auth, adminOnly, getAbandonedLeadById);

module.exports = router;

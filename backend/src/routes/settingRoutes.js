const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  listSettings,
  updateSetting,
  listAbandonedQueueSettings,
  listSystemCronJobs,
  updateSystemCronJob,
  runSystemCronJobNow,
} = require('../controllers/settingController');

const router = express.Router();

router.get('/abandoned-queue', auth, adminOnly, listAbandonedQueueSettings);
router.get('/system-crons', auth, adminOnly, listSystemCronJobs);
router.post('/system-crons/:jobId/run', auth, adminOnly, runSystemCronJobNow);
router.put('/system-crons/:jobId', auth, adminOnly, updateSystemCronJob);
router.get('/', auth, adminOnly, listSettings);
router.put('/:key', auth, adminOnly, updateSetting);

module.exports = router;

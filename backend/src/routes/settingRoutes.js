const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  listSettings,
  updateSetting,
  getLeadAssignmentStrategies,
  updateLeadAssignmentStrategies,
  listAbandonedQueueSettings,
  listSystemCronJobs,
  updateSystemCronJob,
  runSystemCronJobNow,
} = require('../controllers/settingController');
const {
  getSidebarBranding,
  updateSidebarBranding,
  uploadSidebarLogo,
  removeSidebarLogo,
} = require('../controllers/brandingController');
const { uploadBrandingLogo } = require('../middleware/uploadBrandingLogo');

const router = express.Router();

router.get('/branding', auth, getSidebarBranding);
router.put('/branding', auth, adminOnly, updateSidebarBranding);
router.post('/branding/logo', auth, adminOnly, uploadBrandingLogo, uploadSidebarLogo);
router.delete('/branding/logo', auth, adminOnly, removeSidebarLogo);
router.get('/lead-assignment-strategies', auth, adminOnly, getLeadAssignmentStrategies);
router.put('/lead-assignment-strategies', auth, adminOnly, updateLeadAssignmentStrategies);
router.get('/abandoned-queue', auth, adminOnly, listAbandonedQueueSettings);
router.get('/system-crons', auth, adminOnly, listSystemCronJobs);
router.post('/system-crons/:jobId/run', auth, adminOnly, runSystemCronJobNow);
router.put('/system-crons/:jobId', auth, adminOnly, updateSystemCronJob);
router.get('/', auth, adminOnly, listSettings);
router.put('/:key', auth, adminOnly, updateSetting);

module.exports = router;

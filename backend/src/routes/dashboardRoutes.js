const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getDashboardSections,
  getDashboardSectionsVisibility,
  updateDashboardSections,
  resetDashboardSections,
} = require('../controllers/dashboardSectionConfigController');
const {
  getDashboardFilters,
  getDashboardKpis,
  getDashboardStageDistribution,
  getDashboardSources,
  getDashboardUserPerformance,
  getDashboardTasksSummary,
  getDashboardRecentLeads,
  getDashboardLeadTimeline,
  getDashboardPipelineWinRates,
} = require('../controllers/dashboardController');

router.get('/sections', auth, getDashboardSections);
router.get('/sections/visibility', auth, getDashboardSectionsVisibility);
router.put('/sections', auth, authorize(['admin']), updateDashboardSections);
router.post('/sections/reset', auth, authorize(['admin']), resetDashboardSections);

router.get('/filters', auth, getDashboardFilters);
router.get('/kpis', auth, getDashboardKpis);
router.get('/stages', auth, getDashboardStageDistribution);
router.get('/sources', auth, getDashboardSources);
router.get('/user-performance', auth, getDashboardUserPerformance);
router.get('/tasks-summary', auth, getDashboardTasksSummary);
router.get('/recent-leads', auth, getDashboardRecentLeads);
router.get('/lead-timeline', auth, getDashboardLeadTimeline);
router.get('/pipeline-win-rates', auth, getDashboardPipelineWinRates);

module.exports = router;

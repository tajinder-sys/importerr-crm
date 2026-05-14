const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
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

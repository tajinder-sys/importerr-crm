const express = require('express');
const verifyImporterrApiAccess = require('../../middleware/verifyImporterrApiAccess');
const {
  upsertAbandonedLeadFromImporterr,
  updateAbandonedLeadStatusFromImporterr,
} = require('../../controllers/callByImporterr/abandonedLead');

const router = express.Router();

router.post('/abandoned-leads/upsert', verifyImporterrApiAccess, upsertAbandonedLeadFromImporterr);
router.post('/abandoned-leads/status', verifyImporterrApiAccess, updateAbandonedLeadStatusFromImporterr);

module.exports = router;

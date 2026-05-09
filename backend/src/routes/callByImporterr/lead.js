const express = require('express');
const verifyImporterrApiAccess = require('../../middleware/verifyImporterrApiAccess');
const { createLeadFromImporterr } = require('../../controllers//callByImporterr/lead');
const { getQuoteByRefrenceId } = require('../../controllers/callByImporterr/quote');

const router = express.Router();

router.post('/leads/importerr-inquiry', verifyImporterrApiAccess, createLeadFromImporterr);
router.get('/quote/:refrenceId', verifyImporterrApiAccess, getQuoteByRefrenceId);

module.exports = router;

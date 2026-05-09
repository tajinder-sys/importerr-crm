const express = require('express');
const {ingestLeadWebhook } = require('../controllers/channelLeadController');
const router = express.Router();

router.post('/webhook/:channel', ingestLeadWebhook);
module.exports = router;

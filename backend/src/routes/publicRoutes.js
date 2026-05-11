const express = require('express');
const { gmailAuthCallback, gmailWebhook } = require('../controllers/connectedAccountController');
const router = express.Router();

// Public routes (no auth required)
router.get('/auth/gmail/callback', gmailAuthCallback);
router.post('/webhook/gmail', gmailWebhook);

module.exports = router;
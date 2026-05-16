const express = require('express');
const { ingestLeadWebhook } = require('../controllers/channelLeadController');
const {
  listAccounts, createAccount, updateAccount, toggleAccount, deleteAccount,
  gmailAuthRedirect, getGmailAuthUrl, gmailAuthCallback
} = require('../controllers/connectedAccountController');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Gmail OAuth
router.get('/auth/gmail/:accountId/url', auth, adminOnly, getGmailAuthUrl);
router.get('/auth/gmail/callback', gmailAuthCallback);
router.get('/auth/gmail/:accountId', auth, adminOnly, gmailAuthRedirect);

// Generic channel webhooks
router.post('/webhook/:channel', ingestLeadWebhook);
router.post('/webhook/:channel/:accountId', ingestLeadWebhook);

// Connected accounts CRUD
router.get('/accounts', auth, adminOnly, listAccounts);
router.post('/accounts', auth, adminOnly, createAccount);
router.patch('/accounts/:id', auth, adminOnly, updateAccount);
router.patch('/accounts/:id/toggle', auth, adminOnly, toggleAccount);
router.delete('/accounts/:id', auth, adminOnly, deleteAccount);

module.exports = router;

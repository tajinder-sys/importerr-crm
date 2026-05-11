const express = require('express');
const { ingestLeadWebhook } = require('../controllers/channelLeadController');
const {
  listAccounts, createAccount, toggleAccount, deleteAccount,
  gmailAuthRedirect, getGmailAuthUrl
} = require('../controllers/connectedAccountController');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Gmail OAuth
router.get('/auth/gmail/:accountId', auth, adminOnly, gmailAuthRedirect);
router.get('/auth/gmail/:accountId/url', auth, adminOnly, getGmailAuthUrl);

// Gmail webhook - specific route for email channel
router.post('/webhook/email/:accountId', (req, res) => {
  req.params.channel = 'email';
  return ingestLeadWebhook(req, res);
});

// Connected accounts management
router.get('/accounts', auth, adminOnly, listAccounts);
router.post('/accounts', auth, adminOnly, createAccount);
router.patch('/accounts/:id/toggle', auth, adminOnly, toggleAccount);
router.delete('/accounts/:id', auth, adminOnly, deleteAccount);

module.exports = router;

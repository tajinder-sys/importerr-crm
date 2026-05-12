const ConnectedAccount = require('../models/ConnectedAccount');
const { ingestLeadFromChannel } = require('../services/channelLeadService');
const { getAuthUrl, exchangeCode, getEmailAddress, fetchEmailById, parseEmail, getMessagesFromHistory, setupGmailWatch } = require('../services/gmailService');
const { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHandler');

const listAccounts = async (req, res) => {
  try {
    const accounts = await ConnectedAccount.find().sort({ createdAt: -1 }).lean();
    const safe = accounts.map(({ accessToken, refreshToken, googleClientSecret, waAccessToken, ...rest }) => rest);
    return sendSuccess(res, 'Accounts fetched', safe);
  } catch {
    return sendServerError(res, 'Failed to fetch accounts');
  }
};

const createAccount = async (req, res) => {
  const { name, type, googleClientId, googleClientSecret, googleRedirectUri, pubsubTopic, waPhoneNumberId, waAccessToken, waVerifyToken } = req.body;
  if (!name || !type) return sendBadRequest(res, 'name and type are required');
  if (type === 'gmail' && (!googleClientId || !googleClientSecret || !googleRedirectUri || !pubsubTopic))
    return sendBadRequest(res, 'Google Client ID, Secret, Redirect URI and Pub/Sub Topic are required for Gmail');
  if (type === 'whatsapp' && (!waPhoneNumberId || !waAccessToken || !waVerifyToken))
    return sendBadRequest(res, 'Phone Number ID, Access Token and Verify Token are required for WhatsApp');
  try {
    const account = new ConnectedAccount({
      name, type,
      ...(type === 'gmail' && { googleClientId, googleClientSecret, googleRedirectUri, pubsubTopic }),
      ...(type === 'whatsapp' && { waPhoneNumberId, waAccessToken, waVerifyToken })
    });
    account.accountId = account._id.toString();
    await account.save();
    return sendCreated(res, 'Account created', account);
  } catch {
    return sendServerError(res, 'Failed to create account');
  }
};

const toggleAccount = async (req, res) => {
  try {
    const account = await ConnectedAccount.findById(req.params.id);
    if (!account) return sendNotFound(res, 'Account not found');
    account.isActive = !account.isActive;
    await account.save();
    return sendSuccess(res, 'Account updated', account);
  } catch {
    return sendServerError(res, 'Failed to update account');
  }
};

const deleteAccount = async (req, res) => {
  try {
    const account = await ConnectedAccount.findByIdAndDelete(req.params.id);
    if (!account) return sendNotFound(res, 'Account not found');
    return sendSuccess(res, 'Account deleted');
  } catch {
    return sendServerError(res, 'Failed to delete account');
  }
};

// GET /channels/auth/gmail/:accountId — redirect to Google OAuth
const gmailAuthRedirect = async (req, res) => {
  try {
    const account = await ConnectedAccount.findById(req.params.accountId);
    if (!account || account.type !== 'gmail') return sendNotFound(res, 'Account not found');
    const url = getAuthUrl(account);
    return res.redirect(url);
  } catch {
    return sendServerError(res, 'Failed to generate auth URL');
  }
};

// GET /channels/auth/gmail/:accountId/url — return auth URL (for frontend)
const getGmailAuthUrl = async (req, res) => {
  try {
    const account = await ConnectedAccount.findById(req.params.accountId);
    if (!account || account.type !== 'gmail') return sendNotFound(res, 'Account not found');
    const url = getAuthUrl(account);
    return sendSuccess(res, 'Auth URL generated', { url });
  } catch {
    return sendServerError(res, 'Failed to generate auth URL');
  }
};

// GET /channels/auth/gmail/callback — Google redirects here
const gmailAuthCallback = async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return sendBadRequest(res, 'Missing code or state');
  try {
    const account = await ConnectedAccount.findById(state);
    if (!account) return sendNotFound(res, 'Account not found');

    const tokens = await exchangeCode(account, code);

    account.accessToken = tokens.access_token;
    account.refreshToken = tokens.refresh_token || account.refreshToken;
    account.tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    const gmailEmail = await getEmailAddress(account);
    account.gmailEmail = gmailEmail;
    account.isActive = true;

    const historyId = await setupGmailWatch(account);
    if (historyId) account.historyId = historyId;

    await account.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings/api-config?gmail=connected`);
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    return sendServerError(res, 'Failed to connect Gmail');
  }
};

// POST /channels/webhook/gmail — Pub/Sub push notification
const gmailWebhook = async (req, res) => {
  res.sendStatus(200);

  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const { emailAddress, historyId } = decoded;
    if (!emailAddress || !historyId) return;

    const account = await ConnectedAccount.findOne({ gmailEmail: emailAddress, isActive: true });
    if (!account || !account.accessToken) return;

    const startHistoryId = String(parseInt(historyId) - 1);
    const { messageIds, newHistoryId } = await getMessagesFromHistory(account, startHistoryId);

    if (newHistoryId && parseInt(newHistoryId) > parseInt(account.historyId || 0)) {
      account.historyId = newHistoryId;
      await account.save();
    }

    for (const messageId of messageIds) {
      try {
        const emailData = await fetchEmailById(account, messageId);
        const { name, email, body, subject } = parseEmail(emailData);
        if (!email) continue;

        await ingestLeadFromChannel('email', {
          name: name || email.split('@')[0],
          email,
          phone: '',
          message: body || subject || '',
          _accountId: account.accountId
        });
      } catch (err) {
        console.error('Error processing email message:', err.message);
      }
    }
  } catch (err) {
    console.error('Gmail webhook processing error:', err.message);
  }
};

module.exports = { listAccounts, createAccount, toggleAccount, deleteAccount, gmailAuthRedirect, getGmailAuthUrl, gmailAuthCallback, gmailWebhook };

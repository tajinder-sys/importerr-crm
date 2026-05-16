const ConnectedAccount = require('../models/ConnectedAccount');
const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants');
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

const updateAccount = async (req, res) => {
  const { assignedUserIds } = req.body;
  if (assignedUserIds !== undefined && !Array.isArray(assignedUserIds)) {
    return sendBadRequest(res, 'assignedUserIds must be an array');
  }
  try {
    const account = await ConnectedAccount.findById(req.params.id);
    if (!account) return sendNotFound(res, 'Account not found');

    if (assignedUserIds !== undefined) {
      const ids = [...new Set(assignedUserIds.map((id) => String(id).trim()).filter(Boolean))];
      if (ids.length) {
        const validUsers = await User.find({
          _id: { $in: ids },
          isActive: true,
          role: { $in: [USER_ROLES.TEAM_MEMBER, USER_ROLES.TEAM_MANAGER] }
        }).select('_id').lean();
        if (validUsers.length !== ids.length) {
          return sendBadRequest(res, 'One or more invalid team user IDs');
        }
      }
      account.assignedUserIds = ids;
    }

    await account.save();
    const { accessToken, refreshToken, googleClientSecret, waAccessToken, ...safe } = account.toObject();
    return sendSuccess(res, 'Account updated', safe);
  } catch {
    return sendServerError(res, 'Failed to update account');
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

module.exports = { listAccounts, createAccount, updateAccount, toggleAccount, deleteAccount, getGmailAuthUrl, gmailAuthCallback };

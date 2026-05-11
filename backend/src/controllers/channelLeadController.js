const { sendBadRequest, sendCreated, sendSuccess, sendServerError } = require('../utils/responseHandler');
const { ingestLeadFromChannel } = require('../services/channelLeadService');
const ConnectedAccount = require('../models/ConnectedAccount');
const { fetchEmailById, parseEmail, getMessagesFromHistory } = require('../services/gmailService');

const SUPPORTED_CHANNELS = ['whatsapp', 'email', 'meta'];

const handleGmailPubSub = async (req, res, account) => {
  res.sendStatus(200);
  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const { historyId } = decoded;
    if (!historyId) return;

    const startHistoryId = account.historyId || String(parseInt(historyId) - 100);
    console.log(`Gmail webhook: accountId=${account.accountId}, startHistoryId=${startHistoryId}, pubsubHistoryId=${historyId}`);

    const { messageIds, newHistoryId } = await getMessagesFromHistory(account, startHistoryId);
    console.log(`Gmail webhook: found ${messageIds.length} messages`);

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
        console.log(`Lead created from email: ${email}`);
      } catch (err) {
        console.error('Error processing email:', err.message);
      }
    }
  } catch (err) {
    console.error('Gmail pubsub processing error:', err.message);
  }
};

const ingestLeadWebhook = async (req, res) => {
  const channel = String(req.params.channel || '').toLowerCase();
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    return sendBadRequest(res, 'Unsupported channel. Use whatsapp, email, or meta');
  }

  const { accountId } = req.params;
  if (accountId) {
    const account = await ConnectedAccount.findOne({ accountId, isActive: true });
    if (!account) return sendBadRequest(res, 'Invalid or inactive account');

    if (account.type === 'gmail' && req.body?.message?.data) {
      return handleGmailPubSub(req, res, account);
    }

    req.body._accountId = accountId;
  }

  try {
    const result = await ingestLeadFromChannel(channel, req.body);
    if (!result.ok) return sendBadRequest(res, 'Invalid lead payload', result.errors);
    if (result.isNew) return sendCreated(res, 'Lead ingested successfully', result.lead);
    return sendSuccess(res, 'Lead already exists, interaction updated', result.lead);
  } catch (error) {
    console.error(`${channel} webhook ingestion error:`, error);
    return sendServerError(res, 'Failed to ingest lead from webhook');
  }
};

module.exports = { ingestLeadWebhook };

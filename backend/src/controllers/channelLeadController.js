const { sendBadRequest, sendCreated, sendSuccess, sendServerError } = require('../utils/responseHandler');
const { ingestLeadFromChannel } = require('../services/channelLeadService');
const ConnectedAccount = require('../models/ConnectedAccount');
const Lead = require('../models/lead');
const Communication = require('../models/Communication');
const { getMessagesFromHistory } = require('../services/gmailService');
const emailQueue = require('../queues/emailQueue');
const logger = require('../utils/logger');

const SUPPORTED_CHANNELS = ['whatsapp', 'email', 'meta', 'gmail'];

const handleGmailPubSub = async (req, res, account) => {
  res.sendStatus(200); // instant response to Google
  try {
    const message = req.body?.message;
    if (!message?.data) return;
    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const { historyId } = decoded;
    if (!historyId) return;

    const startHistoryId = account.historyId || String(parseInt(historyId) - 100);
    const { messageIds, newHistoryId } = await getMessagesFromHistory(account, startHistoryId);

    if (!messageIds.length) return;

    // Push to queue — worker processes in background
    await emailQueue.add('gmail-pubsub', {
      accountId: account.accountId,
      messageIds,
      newHistoryId,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    logger.info(`[GmailWebhook] Queued ${messageIds.length} message(s) for account ${account.accountId}`);
  } catch (err) {
    logger.error(`[GmailWebhook] Error: ${err.message}`);
  }
};

// GET /webhook/whatsapp/:accountId — Meta verification
const whatsappWebhookVerify = async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await ConnectedAccount.findOne({ accountId, type: 'whatsapp', isActive: true });
    if (!account) return res.sendStatus(403);
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === account.waVerifyToken) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch (err) {
    console.error('WhatsApp verify error:', err.message);
    return res.sendStatus(500);
  }
};

// POST /webhook/whatsapp/:accountId — incoming messages
const whatsappWebhookMessage = async (req, res) => {
  res.sendStatus(200);
  try {
    const { accountId } = req.params;
    const account = await ConnectedAccount.findOne({ accountId, type: 'whatsapp', isActive: true });
    if (!account) return;

    const entry = req.body?.entry?.[0];
    const value = entry?.changes?.[0]?.value;
    if (!value?.messages?.length) return;

    for (const msg of value.messages) {
      if (msg.type !== 'text') continue;
      const phone = msg.from;
      const text = msg.text?.body || '';
      const contactName = value.contacts?.find(c => c.wa_id === msg.from)?.profile?.name || '';
      await ingestLeadFromChannel('whatsapp', {
        name: contactName || phone,
        phone,
        message: text,
        _accountId: account.accountId
      });
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err.message);
  }
};

const ingestLeadWebhook = async (req, res) => {
  const channel = String(req.params.channel || '').toLowerCase();
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    return sendBadRequest(res, 'Unsupported channel. Use whatsapp, email, meta or gmail');
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

  // Queue the ingestion — instant 200 response
  await emailQueue.add('ingest-lead', {
    channel,
    payload: req.body,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });

  return sendSuccess(res, 'Received');
};

module.exports = { ingestLeadWebhook, whatsappWebhookVerify, whatsappWebhookMessage };

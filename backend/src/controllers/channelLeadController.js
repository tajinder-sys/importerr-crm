const { sendBadRequest, sendCreated, sendSuccess, sendServerError } = require('../utils/responseHandler');
const { ingestLeadFromChannel } = require('../services/channelLeadService');
const ConnectedAccount = require('../models/ConnectedAccount');
const Lead = require('../models/lead');
const Communication = require('../models/Communication');
const { fetchEmailById, parseEmail, getMessagesFromHistory } = require('../services/gmailService');

const SUPPORTED_CHANNELS = ['whatsapp', 'email', 'meta', 'gmail'];

const handleGmailPubSub = async (req, res, account) => {
  res.sendStatus(200);
  try {
    const message = req.body?.message;
    if (!message?.data) return;
    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const { historyId } = decoded;
    if (!historyId) return;
    const startHistoryId = account.historyId || String(parseInt(historyId) - 100);
    const { messageIds, newHistoryId } = await getMessagesFromHistory(account, startHistoryId);
    if (newHistoryId && parseInt(newHistoryId) > parseInt(account.historyId || 0)) {
      account.historyId = newHistoryId;
      await account.save();
    }
    for (const messageId of messageIds) {
      try {
        const emailData = await fetchEmailById(account, messageId);
        const { name, email, body, subject, threadId } = parseEmail(emailData);
        if (!email) continue;

        // Thread reply — add to existing lead's communication
        if (threadId) {
          const threadLead = await Lead.findOne({ gmailThreadId: threadId }).lean();
          if (threadLead) {
            await Communication.create({
              lead: threadLead._id,
              senderType: 'client',
              senderUser: null,
              source: 'email',
              direction: 'inbound',
              message: body || subject || '',
              threadId
            });
            console.log(`Thread reply added to lead ${threadLead._id} (threadId: ${threadId})`);
            continue;
          }
        }

        // New email — create new lead
        await ingestLeadFromChannel('email', {
          name: name || email.split('@')[0],
          email,
          phone: '',
          message: body || subject || '',
          _accountId: account.accountId,
          _threadId: threadId
        });
      } catch (err) {
        console.error('Error processing email:', err.message);
      }
    }
  } catch (err) {
    console.error('Gmail pubsub processing error:', err.message);
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

module.exports = { ingestLeadWebhook, whatsappWebhookVerify, whatsappWebhookMessage };

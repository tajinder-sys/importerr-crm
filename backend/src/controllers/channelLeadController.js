const { sendBadRequest, sendSuccess } = require('../utils/responseHandler');
const ConnectedAccount = require('../models/ConnectedAccount');
const { getMessagesFromHistory } = require('../services/gmailService');
const emailQueue = require('../queues/emailQueue');
const logger = require('../utils/logger');

const SUPPORTED_CHANNELS = ['whatsapp', 'email', 'meta', 'gmail'];

// ── Gmail Pub/Sub handler ─────────────────────────────────────────
const handleGmailPubSub = async (req, res, account) => {
  res.sendStatus(200); // instant ACK to Google
  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const { historyId } = decoded;
    if (!historyId) return;

    // ── historyId race condition fix ──────────────────────────────
    // Atomically update historyId only if incoming > stored
    const updated = await ConnectedAccount.findOneAndUpdate(
      {
        _id: account._id,
        $or: [
          { historyId: null },
          { historyId: { $lt: String(parseInt(historyId) - 1) } },
        ],
      },
      { $set: { historyId: String(parseInt(historyId) - 1) } },
      { new: false } // return old doc to get startHistoryId
    );

    const startHistoryId = updated
      ? (updated.historyId || String(parseInt(historyId) - 100))
      : null;

    // Another concurrent request already handled this historyId
    if (!startHistoryId) {
      logger.info(`[GmailWebhook] Skipping duplicate historyId ${historyId} for account ${account.accountId}`);
      return;
    }

    const { messageIds, newHistoryId } = await getMessagesFromHistory(account, startHistoryId);
    if (!messageIds.length) return;

    // Update to final historyId
    if (newHistoryId) {
      await ConnectedAccount.findByIdAndUpdate(account._id, { historyId: newHistoryId });
    }

    // ── Each messageId gets its OWN job (fix retry issue) ─────────
    await Promise.all(
      messageIds.map((messageId) =>
        emailQueue.add(
          'gmail-message',
          { accountId: account.accountId, messageId },
          {
            jobId: `gmail-${account.accountId}-${messageId}`, // dedup by jobId
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        )
      )
    );

    logger.info(`[GmailWebhook] Queued ${messageIds.length} individual job(s) for account ${account.accountId}`);
  } catch (err) {
    logger.error(`[GmailWebhook] Error: ${err.message}`);
  }
};

// ── Generic channel webhook → queue ──────────────────────────────
const ingestLeadWebhook = async (req, res) => {
  const channel = String(req.params.channel || '').toLowerCase();
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    return sendBadRequest(res, 'Unsupported channel. Use whatsapp, email, meta or gmail');
  }

  const { accountId } = req.params;
  if (accountId) {
    const account = await ConnectedAccount.findOne({ accountId, isActive: true });
    if (!account) return sendBadRequest(res, 'Invalid or inactive account');

    // Gmail Pub/Sub — special handling
    if (account.type === 'gmail' && req.body?.message?.data) {
      return handleGmailPubSub(req, res, account);
    }
    req.body._accountId = accountId;
  }

  await emailQueue.add(
    'ingest-lead',
    { channel, payload: req.body },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );

  return sendSuccess(res, 'Received');
};

module.exports = { ingestLeadWebhook };

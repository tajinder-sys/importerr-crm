const { sendBadRequest, sendSuccess } = require('../utils/responseHandler');
const ConnectedAccount = require('../models/ConnectedAccount');
const { getMessagesFromHistory } = require('../services/gmailService');
const emailQueue = require('../queues/emailQueue');
const logger = require('../utils/logger');
const {
  parseGmailHistoryId,
  formatGmailHistoryId,
  gmailHistoryIdBefore,
} = require('../utils/gmailHistoryId');

const SUPPORTED_CHANNELS = ['whatsapp', 'email', 'meta', 'gmail'];

// ── Gmail Pub/Sub handler ─────────────────────────────────────────
const handleGmailPubSub = async (req, res, account) => {
  res.sendStatus(200); // instant ACK to Google
  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
    const notificationHistoryId = decoded.historyId;
    if (!notificationHistoryId) return;

    const notificationBig = parseGmailHistoryId(notificationHistoryId);
    if (notificationBig === null) return;

    const fresh = await ConnectedAccount.findById(account._id).select('historyId').lean();
    const checkpointBig = parseGmailHistoryId(fresh?.historyId);

    // Duplicate Pub/Sub push for an already-synced mailbox state
    if (checkpointBig !== null && checkpointBig >= notificationBig) {
      logger.info(
        `[GmailWebhook] Skipping duplicate notification historyId ${notificationHistoryId} (checkpoint ${fresh.historyId}) for account ${account.accountId}`
      );
      return;
    }

    const startHistoryId =
      checkpointBig !== null
        ? formatGmailHistoryId(checkpointBig)
        : gmailHistoryIdBefore(notificationHistoryId);

    logger.info(
      `[GmailWebhook] Syncing account ${account.accountId} from history ${startHistoryId} (notification ${notificationHistoryId})`
    );

    const { messageIds, newHistoryId } = await getMessagesFromHistory(account, startHistoryId);

    const newCheckpointBig = parseGmailHistoryId(newHistoryId);
    const nextCheckpoint =
      newCheckpointBig !== null && newCheckpointBig >= notificationBig
        ? formatGmailHistoryId(newCheckpointBig)
        : formatGmailHistoryId(notificationBig);

    if (nextCheckpoint) {
      await ConnectedAccount.findByIdAndUpdate(account._id, {
        historyId: nextCheckpoint,
        needsResync: false,
      });
    }

    if (!messageIds.length) {
      logger.info(
        `[GmailWebhook] No new INBOX messages for account ${account.accountId} (notification ${notificationHistoryId})`
      );
      return;
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

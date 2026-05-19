const emailQueue = require('./emailQueue');
const {
  ingestLeadFromChannel,
  recordGmailInboundCommunication,
} = require('../services/channelLeadService');
const {
  fetchEmailById,
  parseEmail,
  normalizeGmailBody,
  isInboundLeadEmail,
} = require('../services/gmailService');
const ConnectedAccount = require('../models/ConnectedAccount');
const GmailProcessedMessage = require('../models/GmailProcessedMessage');
const Lead = require('../models/lead');
const logger = require('../utils/logger');

const CONCURRENCY = 3;

/** Atomically claim a Gmail message so concurrent workers cannot double-process. */
const claimGmailMessage = async (accountId, messageId) => {
  const existing = await GmailProcessedMessage.findOneAndUpdate(
    { accountId, messageId },
    { $setOnInsert: { processedAt: new Date() } },
    { upsert: true, new: false }
  ).lean();
  return !existing;
};

// ── Process individual Gmail message ─────────────────────────────
emailQueue.process('gmail-message', CONCURRENCY, async (job) => {
  const { accountId, messageId } = job.data;

  const account = await ConnectedAccount.findOne({ accountId, isActive: true });
  if (!account) throw new Error(`Account not found: ${accountId}`);

  const claimed = await claimGmailMessage(accountId, messageId);
  if (!claimed) {
    logger.info(`[EmailWorker] Skip duplicate Gmail message ${messageId}`);
    return;
  }

  const emailData = await fetchEmailById(account, messageId);
  const parsed = parseEmail(emailData);
  const { name, email, subject, threadId } = parsed;
  const messageText = normalizeGmailBody(parsed.body || subject || '');

  if (!email) return;

  if (!isInboundLeadEmail(account, emailData, parsed)) {
    logger.info(`[EmailWorker] Skip non-inbound email ${messageId} from ${email}`);
    return;
  }

  // Existing thread → record comm only (no second ingest)
  if (threadId) {
    const threadLead = await Lead.findOne({ gmailThreadId: threadId })
      .select('_id assignedTo')
      .lean();
    if (threadLead) {
      await recordGmailInboundCommunication({
        leadId: threadLead._id,
        gmailMessageId: messageId,
        threadId,
        message: messageText,
        assignedTo: threadLead.assignedTo,
      });
      logger.info(`[EmailWorker] Thread message handled for lead ${threadLead._id}`);
      return;
    }
  }

  const result = await ingestLeadFromChannel('email', {
    name: name || email.split('@')[0],
    email,
    phone: '',
    message: messageText,
    _accountId: account.accountId,
    _threadId: threadId,
    _gmailMessageId: messageId,
    _skipCommunication: true,
  });

  if (!result.ok) {
    logger.warn(`[EmailWorker] Ingestion failed for ${email}: ${result.errors?.join(', ')}`);
    return;
  }

  await recordGmailInboundCommunication({
    leadId: result.lead._id,
    gmailMessageId: messageId,
    threadId,
    message: messageText,
    assignedTo: result.lead.assignedTo,
  });

  logger.info(
    `[EmailWorker] Lead ${result.isNew ? 'created' : 'updated'}: ${result.lead._id} from ${email}`
  );
});

// ── Process generic channel lead (WhatsApp, Email form, Meta) ────
emailQueue.process('ingest-lead', CONCURRENCY, async (job) => {
  const { channel, payload } = job.data;
  const result = await ingestLeadFromChannel(channel, payload);
  if (!result.ok) {
    logger.warn(`[EmailWorker] Lead ingestion failed: ${result.errors?.join(', ')}`);
  } else {
    logger.info(`[EmailWorker] Lead ${result.isNew ? 'created' : 'updated'}: ${result.lead._id}`);
  }
});

// ── Job lifecycle ─────────────────────────────────────────────────
emailQueue.on('completed', (job) => {
  logger.info(`[EmailQueue] Job ${job.id} (${job.name}) completed`);
});

emailQueue.on('failed', (job, err) => {
  logger.error(`[EmailQueue] Job ${job.id} (${job.name}) failed: ${err.message}`);
});

emailQueue.on('stalled', (job) => {
  logger.warn(`[EmailQueue] Job ${job.id} stalled`);
});

logger.info(`[EmailQueue] Worker started (concurrency: ${CONCURRENCY})`);

module.exports = emailQueue;

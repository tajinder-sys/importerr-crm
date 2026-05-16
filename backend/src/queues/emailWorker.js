const emailQueue = require('./emailQueue');
const { ingestLeadFromChannel } = require('../services/channelLeadService');
const { fetchEmailById, parseEmail, getMessagesFromHistory } = require('../services/gmailService');
const { assignLeadWithAI } = require('../services/aiAssignmentService');
const ConnectedAccount = require('../models/ConnectedAccount');
const Lead = require('../models/lead');
const Communication = require('../models/Communication');
const logger = require('../utils/logger');

// ── Concurrency: process 3 emails at a time (tune as needed) ─────
const CONCURRENCY = 3;

emailQueue.process('gmail-pubsub', CONCURRENCY, async (job) => {
  const { accountId, messageIds, newHistoryId } = job.data;

  const account = await ConnectedAccount.findOne({ accountId, isActive: true });
  if (!account) throw new Error(`Account not found: ${accountId}`);

  // Update historyId
  if (newHistoryId && parseInt(newHistoryId) > parseInt(account.historyId || 0)) {
    account.historyId = newHistoryId;
    await account.save();
  }

  for (const messageId of messageIds) {
    try {
      const emailData = await fetchEmailById(account, messageId);
      const { name, email, body, subject, threadId } = parseEmail(emailData);
      if (!email) continue;

      // Thread reply → add to existing lead communication
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
            threadId,
          });
          logger.info(`[EmailWorker] Thread reply added to lead ${threadLead._id}`);
          continue;
        }
      }

      // New lead
      const result = await ingestLeadFromChannel('email', {
        name: name || email.split('@')[0],
        email,
        phone: '',
        message: body || subject || '',
        _accountId: account.accountId,
        _threadId: threadId,
      });

      if (result.ok && result.isNew) {
        logger.info(`[EmailWorker] New lead created: ${result.lead._id} from ${email}`);
      }
    } catch (err) {
      logger.error(`[EmailWorker] Failed to process messageId ${messageId}: ${err.message}`);
    }
  }
});

emailQueue.process('ingest-lead', CONCURRENCY, async (job) => {
  const { channel, payload } = job.data;
  const result = await ingestLeadFromChannel(channel, payload);
  if (!result.ok) {
    logger.warn(`[EmailWorker] Lead ingestion failed: ${result.errors?.join(', ')}`);
  } else {
    logger.info(`[EmailWorker] Lead ${result.isNew ? 'created' : 'updated'}: ${result.lead._id}`);
  }
});

// ── Job lifecycle logs ────────────────────────────────────────────
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

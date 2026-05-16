const emailQueue = require('./emailQueue');
const { ingestLeadFromChannel } = require('../services/channelLeadService');
const { fetchEmailById, parseEmail } = require('../services/gmailService');
const ConnectedAccount = require('../models/ConnectedAccount');
const Lead = require('../models/lead');
const Communication = require('../models/Communication');
const logger = require('../utils/logger');

const CONCURRENCY = 3;

// ── Process individual Gmail message ─────────────────────────────
emailQueue.process('gmail-message', CONCURRENCY, async (job) => {
  const { accountId, messageId } = job.data;

  const account = await ConnectedAccount.findOne({ accountId, isActive: true });
  if (!account) throw new Error(`Account not found: ${accountId}`);

  const emailData = await fetchEmailById(account, messageId);
  const { name, email, body, subject, threadId } = parseEmail(emailData);
  if (!email) return;

  // Thread reply → add communication to existing lead
  if (threadId) {
    const threadLead = await Lead.findOne({ gmailThreadId: threadId }).lean();
    if (threadLead) {
      const msg = body || subject || '';
      const exists = await Communication.findOne({
        lead: threadLead._id,
        threadId,
        message: msg,
      }).lean();

      if (!exists) {
        await Communication.create({
          lead: threadLead._id,
          senderType: 'client',
          senderUser: null,
          source: 'email',
          direction: 'inbound',
          message: msg,
          threadId,
        });
        logger.info(`[EmailWorker] Thread reply added to lead ${threadLead._id}`);
      }
      return;
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

  if (result.ok) {
    logger.info(`[EmailWorker] Lead ${result.isNew ? 'created' : 'updated'}: ${result.lead._id} from ${email}`);
  } else {
    logger.warn(`[EmailWorker] Ingestion failed for ${email}: ${result.errors?.join(', ')}`);
  }
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

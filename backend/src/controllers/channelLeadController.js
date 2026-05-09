const { sendBadRequest, sendCreated, sendSuccess, sendServerError } = require('../utils/responseHandler');
const { ingestLeadFromChannel } = require('../services/channelLeadService');

const SUPPORTED_CHANNELS = ['whatsapp', 'email', 'meta'];

const getChannelHandler = (channel) => async (req, res) => {
  try {
    const result = await ingestLeadFromChannel(channel, req.body);
    if (!result.ok) {
      return sendBadRequest(res, 'Invalid lead payload', result.errors);
    }

    if (result.isNew) {
      return sendCreated(res, 'Lead ingested successfully', result.lead);
    }

    return sendSuccess(res, 'Lead already exists, interaction updated', result.lead);
  } catch (error) {
    console.error(`${channel} lead ingestion error:`, error);
    return sendServerError(res, 'Failed to ingest lead');
  }
};

const ingestLeadWebhook = async (req, res) => {
  const channel = String(req.params.channel || '').toLowerCase();
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    return sendBadRequest(res, 'Unsupported channel. Use whatsapp, email, meta, or ecommerce');
  }

  try {
    const result = await ingestLeadFromChannel(channel, req.body);
    if (!result.ok) {
      return sendBadRequest(res, 'Invalid lead payload', result.errors);
    }
    if (result.isNew) {
      return sendCreated(res, 'Lead ingested successfully via webhook', result.lead);
    }
    return sendSuccess(res, 'Lead already exists, interaction updated via webhook', result.lead);
  } catch (error) {
    console.error(`${channel} webhook ingestion error:`, error);
    return sendServerError(res, 'Failed to ingest lead from webhook');
  }
};

module.exports = {
  ingestLeadWebhook
};

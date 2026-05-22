const ImporterrQuote = require('../models/ImporterrQuote');
const { generateQuoteReferenceId } = require('../helpers/index');
const { sendSuccess, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHandler');
const Lead = require('../models/lead');
const ActivityService = require('../services/ActivityService');
const NotificationService = require('../services/NotificationService');
const { ACTIVITY_TYPES } = require('../utils/constants');
const EmailService = require('../services/EmailService');
const { renderQuoteEmail } = require('../utils/quoteEmailBuilder');
const mongoose = require('mongoose');

const validateQuoteBody = (body) => {
  const { userId, offerId, variants = [], leadId } = body || {};
  if (!userId) return 'userId is required';
  if (!offerId) return 'offerId is required';
  if (!leadId) return 'leadId is required';
  if (!Array.isArray(variants) || !variants.length) return 'variants are required';
  return null;
};

const previewQuoteEmail = async (req, res) => {
  try {
    const err = validateQuoteBody(req.body);
    if (err) return sendBadRequest(res, err);

    const { offerId, variants = [], amounts = {}, leadId } = req.body;
    const lead = await Lead.findById(leadId).lean();
    if (!lead) return sendNotFound(res, 'Lead not found');
    if (!lead.email) return sendBadRequest(res, 'Lead has no email address');

    const rendered = await renderQuoteEmail({
      lead,
      offerId,
      variants,
      amounts,
      referenceId: null,
    });

    return sendSuccess(res, 'Quote email preview generated', rendered);
  } catch (error) {
    console.error('Preview quote email error:', error);
    return sendServerError(res, error.message || 'Failed to preview quote email');
  }
};

const sendQuote = async (req, res) => {
  try {
    const {
      userId,
      offerId,
      variants = [],
      pricing = {},
      amounts = {},
      leadId
    } = req.body || {};
    const validationError = validateQuoteBody(req.body);
    if (validationError) return sendBadRequest(res, validationError);

    const existingQuote = await ImporterrQuote.findOne({
      userId,
      offerId: String(offerId),
      leadId
    });

    const newData = {
      variants: variants,
      pricing: {
        baseAlgorithmId: String(pricing?.baseAlgorithmId || ''),
        originalBreakDown: pricing?.originalBreakDown || [],
        updatedBreakDown: pricing?.updatedBreakDown || [],
        category: pricing?.category,
        formula: pricing?.formula || {}
      },
      amounts: {
        initialFinalPrice: Number(amounts?.initialFinalPrice || 0),
        finalPrice: Number(amounts?.finalPrice || 0),
        discountPercent: Number(amounts?.discountPercent || 0),
        savedAmount: Number(amounts?.savedAmount || 0),
        initialUnitPrice: Number(amounts?.initialUnitPrice || 0)
      },
      source: 'crm',
      status: 'sent'
    };

    let quoteDoc;

    if (existingQuote) {
      existingQuote.history.push({
        referenceId: existingQuote.referenceId,
        variants: existingQuote.variants,
        pricing: existingQuote.pricing,
        amounts: existingQuote.amounts
      });

      existingQuote.referenceId = generateQuoteReferenceId();
      existingQuote.status = 'sent';

      Object.assign(existingQuote, newData);

      quoteDoc = await existingQuote.save();

    } else {
      quoteDoc = await ImporterrQuote.create({
        referenceId: generateQuoteReferenceId(),
        userId,
        leadId,
        offerId: String(offerId),
        ...newData
      });
    }

    const lead = await Lead.findById(req.body.leadId);
    await ActivityService.logActivity({
      leadId: req.body.leadId,
      type: existingQuote === 'send' ? ACTIVITY_TYPES.QUOTE_SENT : ACTIVITY_TYPES.QUOTE_RESENT,
      description:
        existingQuote === 'send'
          ? `Quote ${quoteDoc.referenceId} sent`
          : `Quote ${quoteDoc.referenceId} resent`,
      performedBy: req.user?.id || req.body.userId,
      metadata: {
        quoteId: quoteDoc._id,
        referenceId: quoteDoc.referenceId,
        offerId: quoteDoc.offerId,
        finalPrice: quoteDoc.amounts?.finalPrice,
        discountPercent: quoteDoc.amounts?.discountPercent,
      },
    });
    if (lead?.assignedTo) {
      NotificationService.dispatch({
        type: 'quote_sent',
        title: existingQuote ? 'Quote resent' : 'Quote sent',
        body: `Quote ${quoteDoc.referenceId} for ${lead.name || 'lead'}`,
        assigneeUserId: lead.assignedTo,
        leadId: lead._id,
        actionUrl: `/leads/${lead._id}`,
        actorUserId: req.user?.id || null,
        dedupeKey: `quote_sent:${quoteDoc._id}`,
      }).catch(() => {});
    }
    if (lead?.email) {
      try {
        const { subject, body, templateId, templateSlug } = await renderQuoteEmail({
          lead,
          offerId: quoteDoc.offerId,
          variants: quoteDoc.variants,
          amounts: quoteDoc.amounts,
          referenceId: quoteDoc.referenceId,
        });
        await EmailService.sendHtmlEmail({
          to: lead.email,
          subject,
          html: body,
          templateId,
          metadata: {
            templateSlug,
            quoteId: quoteDoc._id,
            referenceId: quoteDoc.referenceId,
            leadId: req.body.leadId,
          },
        });
        lead.lastInteraction = new Date();
        await lead.save();
      } catch (err) {
        console.error('Email send failed:', err.message);
        // don't break main flow
      }
    }

    sendSuccess(
      res,
      existingQuote === 'resend'
        ? 'Quote resent successfully'
        : 'Quote sent successfully',
      quoteDoc
    );

  } catch (error) {
    console.error('Send importerr quote error:', error);
    sendBadRequest(res, error.message || 'Failed to send quote');
  }
};

const getQuote = async (req, res) => {
  try {
    const { leadId } = req.params;
    const quote = await ImporterrQuote.findOne({
      leadId: new mongoose.Types.ObjectId(leadId)
    }).lean();

    if (quote?.history?.length) {
      quote.history = quote.history.slice().reverse();
    }

    sendSuccess(res, 'Importerr quote fetched successfully', quote);
  } catch (error) {
    console.error('Get importerr quotes error:', error);
    sendBadRequest(res, error.message || 'Failed to fetch importerr quotes');
  }
};

module.exports = { sendQuote, getQuote, previewQuoteEmail };

const ImporterrQuote = require('../models/ImporterrQuote');
const { generateQuoteReferenceId } = require('../helpers/index');
const { sendSuccess, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHandler');
const Lead = require('../models/lead');
const ActivityService = require('../services/ActivityService');
const { ACTIVITY_TYPES } = require('../utils/constants');
const EmailService = require('../services/EmailService');
const mongoose = require('mongoose');

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
    if (!userId)
        sendBadRequest(res, 'userId is required');

    if (!offerId)
        sendBadRequest(res, 'offerId is required');

    if (!Array.isArray(variants) || !variants.length) {
        sendBadRequest(res, 'variants are required');
    }

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
    await ActivityService.createActivity({
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
            discountPercent: quoteDoc.amounts?.discountPercent
        },
    });
    if(lead.email){
      try {
          await EmailService.sendTemplateEmail({
              to: lead.email,
              slug: 'discount-quote',
              data: {
              name: lead.name || 'Customer',
              discount: quoteDoc.amounts?.discountPercent,
              link: `${process.env.FRONTEND_URL}/quote/${quoteDoc.referenceId}`
              },
              metadata: {
              quoteId: quoteDoc._id,
              referenceId: quoteDoc.referenceId,
              leadId: req.body.leadId
              }
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

module.exports = {sendQuote, getQuote};

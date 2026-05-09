const Quote = require('../../models/ImporterrQuote');
const PaymentMethod = require('../../models/PaymentMethod');
const { sendSuccess, sendBadRequest, sendNotFound, sendServerError } = require('../../utils/responseHandler');

const getQuoteByRefrenceId = async (req, res) => {
  try {
    const { refrenceId } = req.params;
    const quote = await Quote.findOne({ referenceId: refrenceId }, { _id: 0, history: 0 }).lean();
    // if (!quote) {
    //   return sendNotFound(res, 'quote not found');
    // }
    if(quote){
      const paymentMethods = await PaymentMethod.find({ isActive: true }).lean();
      quote.paymentMethods = paymentMethods;
    }

    return sendSuccess(res, 'quote fetched successfully', quote);
  } catch (error) {
    return sendServerError(res, error.message || 'Failed to fetch quote');
  }
};

module.exports = {
  getQuoteByRefrenceId
};

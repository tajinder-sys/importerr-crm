const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  sendQuote,
  getQuote,
  previewQuoteEmail,
} = require('../controllers/quote');

router.post('/preview-email', auth, previewQuoteEmail);
router.post('/send', auth, sendQuote);
router.get('/:leadId', auth, getQuote);

module.exports = router;
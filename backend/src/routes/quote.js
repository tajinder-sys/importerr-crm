const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
sendQuote, getQuote
} = require('../controllers/quote');

router.post('/send', auth, sendQuote);
router.get('/:leadId', auth, getQuote);

module.exports = router;
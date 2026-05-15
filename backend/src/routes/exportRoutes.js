const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { getConfig, generate } = require('../controllers/exportController');

const router = express.Router();

router.get('/config', auth, adminOnly, getConfig);
router.post('/generate', auth, adminOnly, generate);

module.exports = router;

const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
  listSellerAssignments,
  upsertSellerAssignment,
} = require('../controllers/sellerAssignmentController');

const router = express.Router();

router.get('/', auth, adminOnly, listSellerAssignments);
router.put('/:importerrUserId', auth, adminOnly, upsertSellerAssignment);

module.exports = router;

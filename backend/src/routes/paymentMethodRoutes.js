const express = require('express');
const router = express.Router();
const {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  togglePaymentMethodStatus
} = require('../controllers/paymentMethodController');
const { auth, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

// Apply authentication middleware to all routes
router.use(auth);

// Apply admin authorization to all routes
router.use(authorize([USER_ROLES.ADMIN]));

// GET /api/payment-methods - Get all payment methods
router.get('/', getPaymentMethods);

// GET /api/payment-methods/:id - Get payment method by ID
router.get('/:id', getPaymentMethodById);

// POST /api/payment-methods - Create new payment method
router.post('/', createPaymentMethod);

// PUT /api/payment-methods/:id - Update payment method
router.put('/:id', updatePaymentMethod);

// DELETE /api/payment-methods/:id - Delete payment method
router.delete('/:id', deletePaymentMethod);

// PATCH /api/payment-methods/:id/toggle - Toggle payment method status
router.patch('/:id/toggle', togglePaymentMethodStatus);

module.exports = router;

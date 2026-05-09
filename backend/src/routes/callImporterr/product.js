const express = require('express');
const {
  getImporterrUserByUserId,
  getImporterrProductVariantPriceDetails,
  getImporterrFinalPriceByOfferId,
} = require('../../controllers/callToImporterr/index');
const { auth } = require('../../middleware/auth');

const router = express.Router();
router.get('/users/:userId', auth, getImporterrUserByUserId);
router.post('/products/get-final-price', auth, getImporterrFinalPriceByOfferId);
router.get('/products/:productRef/product-details', auth, getImporterrProductVariantPriceDetails);

module.exports = router;

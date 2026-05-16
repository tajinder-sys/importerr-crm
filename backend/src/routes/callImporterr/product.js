const express = require('express');
const {
  getImporterrUserByUserId,
  getImporterrSellers,
  getImporterrProductBySku,
  getImporterrProductVariantPriceDetails,
  getImporterrFinalPriceByOfferId,
  getImporterrOrderByID
} = require('../../controllers/callToImporterr/index');
const { auth, adminOnly } = require('../../middleware/auth');

const router = express.Router();
router.get('/users/sellers', auth, adminOnly, getImporterrSellers);
router.get('/users/:userId', auth, getImporterrUserByUserId);
router.post('/products/get-final-price', auth, getImporterrFinalPriceByOfferId);
router.get('/products/sku/:sku', auth, getImporterrProductBySku);
router.get('/products/:productRef/product-details', auth, getImporterrProductVariantPriceDetails);
router.get('/orders/:id', auth, getImporterrOrderByID);
module.exports = router;

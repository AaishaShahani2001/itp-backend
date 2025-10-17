import express from 'express';
import {
  getProducts,
  addProduct,
  updateProduct,
  updateStock,
  deleteProduct
} from '../controllers/productController.js';

import { getNearExpiryProducts, applyDiscount } from '../controllers/productController.js';
import { setManualDiscount } from '../controllers/productController.js';

const router = express.Router();

// All inventory routes require admin authentication
router.get('/', getProducts);           // Fetch all products
router.post('/', addProduct);           // Add new product
router.patch('/:id', updateProduct);    // Update product details
router.patch('/:id/stock', updateStock);// Update stock (increment/decrement)
router.delete('/:id', deleteProduct);   // Delete product
router.get('/near-expiry', getNearExpiryProducts);
router.patch('/:id/discount', applyDiscount);
router.patch('/:id/discount', setManualDiscount);

export default router;

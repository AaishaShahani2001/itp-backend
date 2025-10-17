// server/routes/supplier.js
import express from 'express';
import {
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';

const router = express.Router();

// Protect all routes with adminAuth
router.get('/', getSuppliers);
router.post('/', addSupplier);
router.patch('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;

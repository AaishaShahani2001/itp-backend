// server/routes/orders.js
import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
} from '../controllers/orderController.js';

const router = express.Router();

// Admin can see all orders
router.get('/', getOrders);

// Admin can view a single order
router.get('/:id', getOrderById);

// Admin can create an order
router.post('/', createOrder);

// Admin can update order status
router.patch('/:id', updateOrderStatus);

export default router;

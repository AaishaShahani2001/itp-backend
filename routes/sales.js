import express from 'express';
import { getSales } from '../controllers/salesController.js';

const router = express.Router();
router.get('/', getSales);
export default router;

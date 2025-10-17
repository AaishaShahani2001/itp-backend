//Backend/routes/categories.js
import express from 'express';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', createCategory);
router.patch('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;


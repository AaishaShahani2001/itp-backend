//Backend/controllers/categoryController.js
import Category from '../models/Category.js';

// Create
export const createCategory = async (req, res) => {
  try {
    const { name, subCategory } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const doc = await Category.create({
      name: name.trim(),
      subCategory: subCategory?.trim() || null,
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'This category + sub-category already exists' });
    }
    console.error('createCategory error:', err);
    res.status(500).json({ message: 'Failed to add category' });
  }
};

// Read
export const getCategories = async (_req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1, subCategory: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// Update
export const updateCategory = async (req, res) => {
  try {
    const { name, subCategory } = req.body;
    const update = {};
    if (name != null) update.name = name.trim();
    if (subCategory !== undefined) update.subCategory = subCategory?.trim() || null;

    const updated = await Category.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: 'Category not found' });
    res.json(updated);
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'This category + sub-category already exists' });
    }
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Delete
export const deleteCategory = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

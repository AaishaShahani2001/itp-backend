// server/controllers/productController.js
import Product from '../models/Product.js';

// Get all products with optional filtering
export const getProducts = async (req, res) => {
  try {
    const { search, category, stockStatus, expiryStatus } = req.query;
    let filter = { isActive: true };

    // Search by product name or ID
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { _id: search }, // Allow searching by ID
      ];
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    // Filter by stock status
    if (stockStatus === 'low') {
      filter.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
    } else if (stockStatus === 'adequate') {
      filter.$expr = { $gt: ['$quantity', '$lowStockThreshold'] };
    }

    // ===== Expiry filters =====
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in5Days = new Date();
    in5Days.setDate(today.getDate() + 5);
    in5Days.setHours(23, 59, 59, 999);

    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    in30Days.setHours(23, 59, 59, 999);

    if (expiryStatus === 'near') {
      // 6–30 days from now
      filter.expiryDate = { $gt: in5Days, $lte: in30Days };
    } else if (expiryStatus === 'expired') {
      // expired already OR expiring within 5 days (including today)
      filter.expiryDate = { $ne: null, $lte: in5Days };
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get near-expiry products (within 30 days, all inclusive)
export const getNearExpiryProducts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date();
    limit.setDate(today.getDate() + 30);
    limit.setHours(23, 59, 59, 999);

    const products = await Product.find({
      expiryDate: { $gte: today, $lte: limit },
      isActive: true,
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch near-expiry products' });
  }
};

// Apply discount
export const applyDiscount = async (req, res) => {
  try {
    const { discountPrice } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { discountPrice },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: 'Failed to apply discount' });
  }
};

// Add new product
export const addProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update stock
export const updateStock = async (req, res) => {
  try {
    const { operation, quantity } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (operation === 'add') {
      product.quantity += quantity;
    } else if (operation === 'deduct') {
      if (product.quantity < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      product.quantity -= quantity;
    } else {
      return res.status(400).json({ message: 'Invalid operation' });
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Hard delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Manual discount
export const setManualDiscount = async (req, res) => {
  try {
    const { discount } = req.body; // percent, e.g. 10, 30
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (discount == null || Number(discount) <= 0) {
      // clear manual override
      product.manualDiscountPercent = null;
      product.discountPrice = null; // will be recalculated by auto rules if applicable
    } else {
      product.manualDiscountPercent = Number(discount);
      product.discountPrice = +(
        product.price *
        (1 - product.manualDiscountPercent / 100)
      ).toFixed(2);
    }

    await product.save();
    res.json({ message: 'Discount updated', product });
  } catch (err) {
    res.status(500).json({ message: 'Error updating discount' });
  }
};

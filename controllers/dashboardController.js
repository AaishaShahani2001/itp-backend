import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import { applyAutoDiscounts } from './salesController.js';

export const getDashboardStats = async (req, res) => {
  try {
     await applyAutoDiscounts(); // keep discounts fresh
    // Counts
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStock = await Product.countDocuments({ isActive: true, quantity: { $lt: 10 } }); // ✅ fixed
    const totalSuppliers = await Supplier.countDocuments();
    const discountedProducts = await Product.countDocuments({
      isActive: true,
      discountPrice: { $ne: null },
    });

    // Product array (for charts)
    const products = await Product.find({ isActive: true }).select(
      "name category quantity expiryDate discountPrice"
    );

    // Send response
    res.json({
      totalProducts,
      lowStock,
      totalSuppliers,
      discountedProducts,
      products,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
};

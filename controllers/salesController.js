import Product from '../models/Product.js';
import { computeAutoDiscount } from '../utils/discounts.js';

// Run this before returning sales/dashboard so pricing is up to date
export const applyAutoDiscounts = async () => {
  const products = await Product.find({ isActive: true }).select('price expiryDate discountPrice manualDiscountPercent');
  const ops = [];

  for (const p of products) {
    // respect manual override
    if (p.manualDiscountPercent != null) {
      const manual = +(p.price * (1 - p.manualDiscountPercent / 100)).toFixed(2);
      if (p.discountPrice !== manual) {
        ops.push(Product.updateOne({ _id: p._id }, { $set: { discountPrice: manual } }));
      }
      continue;
    }

    // auto discount
    const autoPrice = computeAutoDiscount(p);
    const shouldClear = autoPrice == null && p.discountPrice != null;
    const shouldSet   = autoPrice != null && p.discountPrice !== autoPrice;

    if (shouldClear) ops.push(Product.updateOne({ _id: p._id }, { $set: { discountPrice: null } }));
    if (shouldSet)   ops.push(Product.updateOne({ _id: p._id }, { $set: { discountPrice: autoPrice } }));
  }

  if (ops.length) await Promise.all(ops);
};

export const getSales = async (req, res) => {
  await applyAutoDiscounts();
  const items = await Product
    .find({ isActive: true, discountPrice: { $ne: null } })
    .select('name category price discountPrice expiryDate quantity');
  res.json(items);
};

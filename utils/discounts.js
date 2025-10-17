export function computeAutoDiscount(product) {
  if (!product.expiryDate || product.price == null) return null;

  const today = new Date();
  const expiry = new Date(product.expiryDate);
  if (expiry <= today) return null; // expired → not for sale

  const days = Math.ceil((expiry - today) / 86400000); // ms → days

  if (days <= 7)  return +((product.price * 0.70).toFixed(2)); // 30% off
  if (days <= 30) return +((product.price * 0.90).toFixed(2)); // 10% off
  return null; // no discount
}

// server/models/Product.js
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
   subCategory: {
    type: String,
    trim: true,
    default: null, 
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Date,
    required: false
  },
  discountPrice: { 
    type: Number,
    default: null,
    min: [0, 'Discount price cannot be negative'],
   },
  image: {
    type: String, // URL to image
    default: ''
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
 
  manualDiscountPercent: { type: Number, default: null }, // if set, manual override (0–100), null means auto/none
}, {
  timestamps: true
});

export default mongoose.model('Product', ProductSchema);
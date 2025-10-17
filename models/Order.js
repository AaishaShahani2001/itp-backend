// server/models/Order.js
import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerEmail: {
    type: String
  },
  customerPhone: {
    type: String
  },
  shippingAddress: {
    fullName: String,
    address: String,
    city: String,
    district: String
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    price: Number
  }],
  total: {
    type: Number
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash_on_delivery'],
    default: 'card'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Generate order number before validation
OrderSchema.pre('validate', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `PM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Order', OrderSchema);

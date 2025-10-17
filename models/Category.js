//Backend/models/Category.js
import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  subCategory: {
    type: String,
    trim: true,
    default: null,
  },
});

// Unique only when name+subCategory are the same
CategorySchema.index({ name: 1, subCategory: 1 }, { unique: true });

export default mongoose.model('Category', CategorySchema);

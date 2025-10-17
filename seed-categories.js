// Seed script to add default categories
import mongoose from 'mongoose';
import Category from './models/Category.js';
import dotenv from 'dotenv';

dotenv.config();

const defaultCategories = [
  { name: 'Food', subCategory: 'Dry Food' },
  { name: 'Food', subCategory: 'Wet Food' },
  { name: 'Medication', subCategory: 'Vitamins' },
  { name: 'Medication', subCategory: 'Supplements' },
  { name: 'Accessories', subCategory: 'Collars' },
  { name: 'Accessories', subCategory: 'Leashes' },
  { name: 'Toys', subCategory: 'Interactive' },
  { name: 'Toys', subCategory: 'Chew Toys' },
  { name: 'Grooming', subCategory: 'Shampoo' },
  { name: 'Grooming', subCategory: 'Brushes' }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/petpulse');
    console.log('✅ Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️ Cleared existing categories');

    // Insert default categories
    const categories = await Category.insertMany(defaultCategories);
    console.log(`✅ Inserted ${categories.length} categories`);

    // List all categories
    const allCategories = await Category.find();
    console.log('📋 All categories:', allCategories);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();

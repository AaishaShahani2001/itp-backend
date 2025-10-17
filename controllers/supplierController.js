// server/controllers/supplierController.js
import Supplier from '../models/Supplier.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
};

// @desc    Add a new supplier
// @route   POST /api/suppliers
export const addSupplier = async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: 'Failed to add supplier' });
  }
};

// @desc    Update supplier
// @route   PATCH /api/suppliers/:id
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update supplier' });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete supplier' });
  }
};

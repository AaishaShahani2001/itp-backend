// server/controllers/orderController.js
import Order from '../models/Order.js';

// Create a new order
export const createOrder = async (req, res) => {
  try {
    console.log("Incoming Order:", req.body);

    const order = new Order(req.body);
    await order.save();

    res.status(201).json(order); // ✅ Send response back
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(400).json({ message: error.message });
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer", "name email")
      .populate("items.product", "name price");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get one order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email")
      .populate("items.product", "name price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "node:fs";
import { fileURLToPath } from "url";

// Routes
import VetRoute from "./routes/VetRoute.js";
import GroomingRoute from "./routes/GroomingRoute.js";
import DayCareRoute from "./routes/DayCareRoute.js";
import scheduleRoute from "./routes/scheduleRoute.js";
import userRouter from "./routes/userRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import adoptionRouter from "./routes/adoptionRoutes.js";
import caretakerRouter from "./routes/caretakerRoutes.js";
import doctorRouter from "./routes/doctorRoutes.js";
import multer from "multer";
import inventoryRoutes from './routes/inventory.js';
import orderRoutes from './routes/orders.js';
import salesRoutes from './routes/sales.js';
import categoryRoutes from './routes/categories.js';
import supplierRoutes from './routes/supplier.js';
import dashboardRoutes from './routes/dashboard.js';
import paymentsRouter from "./routes/payments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

// ---------- Create uploads directory----------
const slipsDir = path.join(__dirname, "uploads", "slips");
fs.mkdirSync(slipsDir, { recursive: true });

//Initializing express app
const app = express();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads", "slips")));


//--------------------------- Route --------------------------//
app.use("/api/vet", VetRoute)
app.use("/api/grooming", GroomingRoute)
app.use("/api/daycare", DayCareRoute)
app.use("/api/schedule", scheduleRoute)
app.use('/api/user', userRouter)
app.use('/api/admin', adminRouter)
app.use('/api/caretaker', caretakerRouter)
app.use('/api/adoption', adoptionRouter)
app.use('/api/doctor', doctorRouter)
app.use("/api/payments", paymentsRouter)

// Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sales', salesRoutes);

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
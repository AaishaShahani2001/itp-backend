import express from 'express'
import { addCareTaker, addDoctor, cancelAdoption, changeAdoptionStatus, getAdoptions, getAllUsers, getDashboardData, getPets, loginAdmin, getAllReviews, deleteReview } from '../controllers/adminController.js';
import authAdmin from '../middleware/authAdmin.js';
import upload from '../middleware/multer.js';

const adminRouter = express.Router();

adminRouter.post("/pet", authAdmin, getPets)
adminRouter.get("/getAdoption", authAdmin, getAdoptions)
adminRouter.post("/login", loginAdmin)
adminRouter.put("/change-status", authAdmin, changeAdoptionStatus)
adminRouter.get("/dashboard", authAdmin, getDashboardData)
adminRouter.post("/add-doctor", authAdmin, upload.single("image"), addDoctor)
adminRouter.post("/add-caretaker", authAdmin, upload.single("image"), addCareTaker)
adminRouter.delete("/cancel-adoption/:adoptionId", authAdmin, cancelAdoption)
adminRouter.get("/get-user", authAdmin, getAllUsers)

// Review management routes
adminRouter.get("/reviews", authAdmin, getAllReviews)
adminRouter.delete("/delete-review/:reviewId", authAdmin, deleteReview)

export default adminRouter;
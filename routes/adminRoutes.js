import express from 'express'
import { addCareTaker, updateCareTaker, deleteCareTaker, addDoctor, updateDoctor, deleteDoctor, cancelAdoption, changeAdoptionStatus, getAdoptions, getAllUsers, getDashboardData, getPets, loginAdmin, getAllReviews, deleteReview, listDoctors, listCaretakers } from '../controllers/adminController.js';
import authAdmin from '../middleware/authAdmin.js';
import upload from '../middleware/multer.js';

const adminRouter = express.Router();

adminRouter.post("/pet", authAdmin, getPets)
adminRouter.get("/getAdoption", authAdmin, getAdoptions)
adminRouter.post("/login", loginAdmin)
adminRouter.put("/change-status", authAdmin, changeAdoptionStatus)
adminRouter.get("/dashboard", authAdmin, getDashboardData)
adminRouter.post("/add-doctor", authAdmin, upload.single("image"), addDoctor)
adminRouter.put("/update-doctor/:id", authAdmin, upload.single("image"), updateDoctor);
adminRouter.delete("/delete-doctor/:id", authAdmin, deleteDoctor);
adminRouter.get("/doctors", authAdmin, listDoctors)
adminRouter.post("/add-caretaker", authAdmin, upload.single("image"), addCareTaker)
adminRouter.put("/update-caretaker/:id", authAdmin, upload.single("image"), updateCareTaker);
adminRouter.delete("/delete-caretaker/:id", authAdmin, deleteCareTaker);
adminRouter.get("/caretakers", authAdmin, listCaretakers)
adminRouter.delete("/cancel-adoption/:adoptionId", authAdmin, cancelAdoption)
adminRouter.get("/get-user", authAdmin, getAllUsers)

// Review management routes
adminRouter.get("/reviews", authAdmin, getAllReviews)
adminRouter.delete("/delete-review/:reviewId", authAdmin, deleteReview)

export default adminRouter;

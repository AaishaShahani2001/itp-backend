import express from 'express'
import { 
  addPet, 
  editPet, 
  getPets, 
  getPetById, 
  getPetStats, 
  markPetAsAdopted,
  loginCaretaker, 
  removePet, 
  updateUserImage 
} from '../controllers/caretakerController.js';
import upload from '../middleware/multer.js';

const caretakerRouter = express.Router();

// Pet CRUD operations
caretakerRouter.post("/add-pet", upload.single("image"), addPet)
caretakerRouter.get("/pets", getPets)
caretakerRouter.get("/pets/:id", getPetById)
caretakerRouter.get("/pets-stats", getPetStats)
caretakerRouter.put("/edit-pet/:id", upload.single("image"), editPet)
caretakerRouter.post("/remove-pet", removePet)
caretakerRouter.post("/mark-adopted", markPetAsAdopted)

// User operations
caretakerRouter.post("/update-image", upload.single("image"), updateUserImage)
caretakerRouter.post("/login", loginCaretaker)

export default caretakerRouter;
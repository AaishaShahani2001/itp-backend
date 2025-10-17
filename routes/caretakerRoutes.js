import express from 'express'
import { addPet, editPet, getPets, loginCaretaker, removePet, updateUserImage } from '../controllers/caretakerController.js';
import upload from '../middleware/multer.js';

const caretakerRouter = express.Router();

caretakerRouter.post("/add-pet", upload.single("image"), addPet)
caretakerRouter.get("/pets", getPets)
caretakerRouter.post("/remove-pet", removePet)
caretakerRouter.post("/update-image", upload.single("image"), updateUserImage)
caretakerRouter.put("/edit-pet/:id", upload.single("image"), editPet)
caretakerRouter.post("/login", loginCaretaker)

export default caretakerRouter;
import express from 'express';
import { changePaymentStatus, createAdoption, deleteAdoption, editAdoption, getAdoptionById, getUserAdoptions } from '../controllers/adoptionController.js';
import authUser from '../middleware/authUser.js';
import upload from '../middleware/multer.js';

const adoptionRouter = express.Router();

adoptionRouter.post('/create', authUser, upload.single('nicImage'), createAdoption)
adoptionRouter.get('/user', authUser, getUserAdoptions)
adoptionRouter.put('/edit-adoption/:adoptionId', authUser, editAdoption)
adoptionRouter.delete('/delete-adoption/:adoptionId', authUser, deleteAdoption)
adoptionRouter.get('/details/:adoptionId', authUser, getAdoptionById)
adoptionRouter.patch('/:id/pay', authUser, changePaymentStatus)

export default adoptionRouter;

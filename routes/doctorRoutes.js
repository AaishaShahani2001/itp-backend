import express from 'express'
import { loginDoctor } from '../controllers/doctorController.js';

const doctorRouter = express.Router();

doctorRouter.post("/login", loginDoctor)

export default doctorRouter;
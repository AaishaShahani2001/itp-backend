import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const adoptionSchema = new mongoose.Schema({
    pet: {type: ObjectId, ref: "Pet"},
    user: {type: ObjectId, ref: "User"},
    name: {type: String, trim: true},
    date: {type: Date},
    visit: {type: Date, default: null},
    status: {type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending"},
    price: {type: Number},
    address: {type: String, trim: true},
    phone: {type: String},
    age: {type: Number},
    child: {type: String},
    reason: {type: String, trim: true},
    occupation: {type: String, trim: true},
    experience: {type: String},
    livingSpace: {type: String},
    otherPets: {type: String},
    timeCommitment: {type: String},
    emergencyContact: {type: String, trim: true},
    isPaid: {type: Boolean, default: false},
    nicImage: {type: String, trim: true}
}, {timestamps: true})

const Adoption = mongoose.model('Adoption', adoptionSchema)

export default Adoption;
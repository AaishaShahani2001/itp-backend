import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const petSchema = new mongoose.Schema({
    species: {
        type: String, 
        trim: true
    },
    breed: {
        type: String, 
        trim: true
    },
    gender: {
        type: String, 
        trim: true
    },
    color: {
        type: String, 
        trim: true
    },
    diet: {
        type: String, 
        trim: true
    },
    image: {
        type: String, 
        trim: true
    },
    age: {
        type: Number
    },
    price: {
        type: Number
    },
    medical: {
        type: String, 
        trim: true
    },
    born: {
        type: String, 
        trim: true
    },
    weight: {
        type: Number
    },
    goodWithKids: {
        type: String,
        trim: true
    },
    goodWithPets: {
        type: String,
        trim: true
    },
    isAdopted: { 
        type: Boolean, 
        default: false 
    },
}, {timestamps: true})

const Pet = mongoose.model("Pet", petSchema)

export default Pet;
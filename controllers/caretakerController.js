import express from 'express';
import mongoose from 'mongoose'; // Add mongoose import
import imageKit from "../configs/imageKit.js";
import Pet from "../models/Pet.js";
import User from "../models/User.js";
import { promises as fs } from "fs";   // ✅ correct import
import jwt from 'jsonwebtoken';

//API to add pets
export const addPet = async (req, res) => {
    try {
        console.log("Add pet request received");
        console.log("Request body:", req.body);
        console.log("Request file:", req.file);
        
        // Validate required fields
        if (!req.file) {
            console.log("No image file provided");
            return res.status(400).json({
                success: false,
                message: "Pet image is required"
            });
        }

        if (!req.body.petDATA) {
            console.log("No pet data provided");
            return res.status(400).json({
                success: false,
                message: "Pet data is required"
            });
        }

        let pet;
        try {
            pet = JSON.parse(req.body.petDATA);
            console.log("Parsed pet data:", pet);
        } catch (parseError) {
            console.log("JSON parse error:", parseError);
            return res.status(400).json({
                success: false,
                message: "Invalid pet data format"
            });
        }

        // Validate image file
        const imageFile = req.file;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(imageFile.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Only JPEG, PNG, and WebP images are allowed"
            });
        }

        if (imageFile.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: "Image size must be less than 5MB"
            });
        }

        // Validate pet data fields
        const requiredFields = [
            'species', 'breed', 'gender', 'color', 'diet', 'age', 'price', 'medical', 'born',
            'weight', 'goodWithKids', 'goodWithPets'
        ];
        for (const field of requiredFields) {
            if (!pet[field] || pet[field].toString().trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
                });
            }
        }

        // Basic validation - convert age, price, and weight to numbers
        const age = Number(pet.age);
        const price = Number(pet.price);
        const weight = Number(pet.weight);
        
        if (isNaN(age) || age < 0) {
            return res.status(400).json({
                success: false,
                message: "Age must be a valid positive number"
            });
        }

        if (isNaN(price) || price < 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a valid positive number"
            });
        }

        if (isNaN(weight) || weight < 0) {
            return res.status(400).json({
                success: false,
                message: "Weight must be a valid positive number"
            });
        }

        // Upload to imageKit
        let optimizedImageURL;
        try {
            const fileBuffer = await fs.readFile(imageFile.path);
            console.log("File buffer read successfully");

            const response = await imageKit.upload({
                file: fileBuffer,
                fileName: imageFile.originalname,
                folder: '/pets'
            });
            console.log("ImageKit upload successful:", response);

            // Optimization through imageKit URL transformation
            optimizedImageURL = imageKit.url({
                path: response.filePath,
                transformation: [
                    {width: '1280'}, //resizing
                    {quality: 'auto'}, //auto compression
                    {format: 'webp'} //convert to webp format
                ]
            });
            console.log("Optimized image URL:", optimizedImageURL);
        } catch (imageKitError) {
            console.error("ImageKit error:", imageKitError);
            // Fallback to a placeholder or handle the error
            return res.status(500).json({
                success: false,
                message: "Failed to upload image"
            });
        }

        // Create pet with validated data
        const petData = {
            ...pet,
            age: age,
            price: price,
            weight: weight,
            image: optimizedImageURL
        };

        console.log("Creating pet with data:", petData);
        await Pet.create(petData);
        console.log("Pet created successfully");

        res.json({
            success: true, 
            message: "Pet added successfully"
        });

    } catch (error) {
        console.error("Add pet error:", error);
        console.error("Error stack:", error.stack);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

//API to list pets
export const getPets = async (req, res) => {
  try {
    const pets = await Pet.find({isAdopted: false}).select('_id species breed gender color diet medical age price born weight goodWithKids goodWithPets image');

    if (!pets || pets.length === 0) {
      return res.status(404).json({ success: false, message: 'No pets found' });
    }

    res.json({ success: true, pets });

  } catch (error) {
    console.error('Error in getPets:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//API to remove pets
export const removePet = async (req, res) => {
  try {
    const { petId } = req.body;
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }
    await Pet.findByIdAndDelete(petId);
    res.json({ success: true, message: "Pet removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to edit pet details
export const editPet = async (req, res) => {
  try {
    console.log("editPet route hit for raw params:", req.params);
    const { id } = req.params;
    console.log("Received edit request for pet ID:", id, "Type:", typeof id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid pet ID format" });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({ success: false, message: "Pet not found" });
    }

    let image = pet.image;

    if (req.file) {
      const fileBuffer = await fs.readFile(req.file.path);
      const uploadResponse = await imageKit.upload({
        file: fileBuffer,
        fileName: req.file.originalname,
        folder: "/pets",
      });
      console.log("ImageKit upload response:", uploadResponse);

      image = imageKit.url({
        path: uploadResponse.filePath,
        transformation: [
          { width: "1280" },
          { quality: "auto" },
          { format: "webp" },
        ],
      });

      await fs.unlink(req.file.path);
    }

    const age = req.body.age ? parseInt(req.body.age, 10) : pet.age;
    const price = req.body.price ? parseFloat(req.body.price) : pet.price;
    const weight = req.body.weight ? parseFloat(req.body.weight) : pet.weight;
    
    if (isNaN(age) || isNaN(price)) {
      return res.status(400).json({ success: false, message: "Invalid age or price" });
    }
    
    if (weight && isNaN(weight)) {
      return res.status(400).json({ success: false, message: "Invalid weight" });
    }

    const updatedData = {
      species: req.body.species ?? pet.species,
      breed: req.body.breed ?? pet.breed,
      gender: req.body.gender ?? pet.gender,
      color: req.body.color ?? pet.color,
      diet: req.body.diet ?? pet.diet,
      medical: req.body.medical ?? pet.medical,
      age,
      price,
      weight: weight ?? pet.weight,
      goodWithKids: req.body.goodWithKids ?? pet.goodWithKids,
      goodWithPets: req.body.goodWithPets ?? pet.goodWithPets,
      born: req.body.born ?? pet.born,
      image,
    };

    const updatedPet = await Pet.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    console.log("Updated pet:", updatedPet);
    res.json({ success: true, pet: updatedPet });

  } catch (err) {
    console.error("Error editing pet:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


//API to update user image
export const updateUserImage = async (req, res)=>{
  try {
    const { _id } = req.user;

    const imageFile = req.file;

    // Validate file presence
    if (!imageFile) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    // Validate file type
    if (!imageFile.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: "Only image files are allowed" });
    }

        //Upload to imageKit
        const fileBuffer = await fs.readFile(imageFile.path)

        const response = await imageKit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users'
        })

        // //Optimization through imageKit URL transformation
        var optimizedImageURL = imageKit.url({
            path: response.filePath,
            transformation: [
                {width: '400'}, //resizing
                {quality: 'auto'}, //auto compression
                {format: 'webp'} //convert to webp format
            ]
        });

        const image = optimizedImageURL;

        await User.findByIdAndUpdate(_id, {image});
        res.json({success: true, message: "Image updated"})
    
  } catch (error) {
    console.log(error.message);
    res.json({success: false, message: error.message})
  }
}

//API for caretaker login
export const loginCaretaker = async (req, res) => {
  try {
    const {email, password} = req.body;

    if (email === process.env.CARETAKER_EMAIL && password === process.env.CARETAKER_PASSWORD) {

      const token = jwt.sign(email+password, process.env.JWT_SECRET)
      res.json({success: true, token})
    }

    else {
      res.json({success: false, message: "Invalid credentials."})
    }
    
  } catch (error) {
    console.log(error.message);
    res.json({success: false, message: error.message})
  }
}
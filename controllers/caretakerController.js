import express from 'express';
import mongoose from 'mongoose';
import imageKit from "../configs/imageKit.js";
import Pet from "../models/Pet.js";
import User from "../models/User.js";
import careTakerModel from "../models/careTakerModel.js";
import { promises as fs } from "fs";
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

        // Enhanced validation for pet data fields
        const requiredFields = [
            'species', 'breed', 'gender', 'color', 'diet', 'age', 'price', 'medical', 'born',
            'weight', 'goodWithKids', 'goodWithPets'
        ];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!pet[field] || pet[field].toString().trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`
                });
            }
        }

        // Validate species
        const validSpecies = ['Dog', 'Cat', 'Rabbit', 'Parrot', 'Bird', 'Fish', 'Hamster', 'Guinea Pig', 'Pigeon', 'Other'];
        if (!validSpecies.includes(pet.species)) {
            return res.status(400).json({
                success: false,
                message: `Species must be one of: ${validSpecies.join(', ')}`
            });
        }

        // Validate gender
        if (!['Male', 'Female', 'male', 'female'].includes(pet.gender)) {
            return res.status(400).json({
                success: false,
                message: "Gender must be either Male or Female"
            });
        }

        // Validate goodWithKids and goodWithPets
        if (!['Yes', 'No', 'Unknown'].includes(pet.goodWithKids)) {
            return res.status(400).json({
                success: false,
                message: "Good with kids must be Yes, No, or Unknown"
            });
        }

        if (!['Yes', 'No', 'Unknown'].includes(pet.goodWithPets)) {
            return res.status(400).json({
                success: false,
                message: "Good with pets must be Yes, No, or Unknown"
            });
        }

        // Validate string lengths
        if (pet.breed.length < 2 || pet.breed.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Breed must be between 2 and 50 characters"
            });
        }

        if (pet.color.length < 2 || pet.color.length > 30) {
            return res.status(400).json({
                success: false,
                message: "Color must be between 2 and 30 characters"
            });
        }

        if (pet.diet.length < 5 || pet.diet.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Diet information must be between 5 and 200 characters"
            });
        }

        if (pet.medical.length < 5 || pet.medical.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Medical information must be between 5 and 500 characters"
            });
        }

        if (pet.born.length < 5 || pet.born.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Birth information must be between 5 and 100 characters"
            });
        }

        // Enhanced numeric validation
        const age = Number(pet.age);
        const price = Number(pet.price);
        const weight = Number(pet.weight);
        
        if (isNaN(age) || age < 0 || age > 30) {
            return res.status(400).json({
                success: false,
                message: "Age must be a valid number between 0 and 30 years"
            });
        }

        if (isNaN(price) || price < 0 || price > 100000) {
            return res.status(400).json({
                success: false,
                message: "Price must be a valid number between 0 and 100,000"
            });
        }

        if (isNaN(weight) || weight < 0.1 || weight > 200) {
            return res.status(400).json({
                success: false,
                message: "Weight must be a valid number between 0.1 and 200 kg"
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

//API to list pets with enhanced filtering
export const getPets = async (req, res) => {
  try {
    const {
      species,
      breed,
      gender,
      minAge,
      maxAge,
      minPrice,
      maxPrice,
      goodWithKids,
      goodWithPets,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isAdopted: false };
    
    if (species) filter.species = new RegExp(species, 'i');
    if (breed) filter.breed = new RegExp(breed, 'i');
    if (gender) filter.gender = gender;
    if (goodWithKids) filter.goodWithKids = goodWithKids;
    if (goodWithPets) filter.goodWithPets = goodWithPets;
    
    // Age range filter
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = Number(minAge);
      if (maxAge) filter.age.$lte = Number(maxAge);
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const pets = await Pet.find(filter)
      .select('_id species breed gender color diet medical age price born weight goodWithKids goodWithPets image createdAt')
      .sort(sort);

    if (!pets || pets.length === 0) {
      return res.status(404).json({ success: false, message: 'No pets found matching the criteria' });
    }

    res.json({ success: true, pets });

  } catch (error) {
    console.error('Error in getPets:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//API to remove pets with enhanced validation
export const removePet = async (req, res) => {
  try {
    const { petId } = req.body;
    
    // Validate petId
    if (!petId) {
      return res.status(400).json({ 
        success: false, 
        message: "Pet ID is required" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid pet ID format" 
      });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ 
        success: false, 
        message: "Pet not found" 
      });
    }

    // Check if pet is already adopted
    if (pet.isAdopted) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot remove an adopted pet" 
      });
    }

    await Pet.findByIdAndDelete(petId);
    res.json({ 
      success: true, 
      message: "Pet removed successfully",
      removedPet: {
        id: pet._id,
        species: pet.species,
        breed: pet.breed
      }
    });
  } catch (error) {
    console.error('Error removing pet:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// API to edit pet details with enhanced validation
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

    // Check if pet is adopted (prevent editing adopted pets)
    if (pet.isAdopted) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot edit an adopted pet" 
      });
    }

    let image = pet.image;

    // Handle image upload if provided
    if (req.file) {
      // Validate image file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Only JPEG, PNG, and WebP images are allowed"
        });
      }

      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "Image size must be less than 5MB"
        });
      }

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

    // Enhanced validation for updated data
    const updateData = {};

    // Validate species if provided
    if (req.body.species) {
      const validSpecies = ['Dog', 'Cat', 'Rabbit', 'Parrot', 'Bird', 'Fish', 'Hamster', 'Guinea Pig', 'Pigeon', 'Other'];
      if (!validSpecies.includes(req.body.species)) {
        return res.status(400).json({
          success: false,
          message: `Species must be one of: ${validSpecies.join(', ')}`
        });
      }
      updateData.species = req.body.species;
    }

    // Validate gender if provided
    if (req.body.gender) {
      if (!['Male', 'Female', 'male', 'female'].includes(req.body.gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be either Male or Female"
        });
      }
      updateData.gender = req.body.gender;
    }

    // Validate goodWithKids if provided
    if (req.body.goodWithKids) {
      if (!['Yes', 'No', 'Unknown'].includes(req.body.goodWithKids)) {
        return res.status(400).json({
          success: false,
          message: "Good with kids must be Yes, No, or Unknown"
        });
      }
      updateData.goodWithKids = req.body.goodWithKids;
    }

    // Validate goodWithPets if provided
    if (req.body.goodWithPets) {
      if (!['Yes', 'No', 'Unknown'].includes(req.body.goodWithPets)) {
        return res.status(400).json({
          success: false,
          message: "Good with pets must be Yes, No, or Unknown"
        });
      }
      updateData.goodWithPets = req.body.goodWithPets;
    }

    // Validate string fields with length checks
    const stringFields = ['breed', 'color', 'diet', 'medical', 'born'];
    for (const field of stringFields) {
      if (req.body[field] !== undefined) {
        const value = req.body[field].toString().trim();
        if (value === '') {
          return res.status(400).json({
            success: false,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty`
          });
        }
        
        // Length validation based on field
        const lengthLimits = {
          breed: [2, 50],
          color: [2, 30],
          diet: [5, 200],
          medical: [5, 500],
          born: [5, 100]
        };
        
        const [min, max] = lengthLimits[field];
        if (value.length < min || value.length > max) {
          return res.status(400).json({
            success: false,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} must be between ${min} and ${max} characters`
          });
        }
        
        updateData[field] = value;
      }
    }

    // Validate numeric fields
    if (req.body.age !== undefined) {
      const age = Number(req.body.age);
      if (isNaN(age) || age < 0 || age > 30) {
        return res.status(400).json({
          success: false,
          message: "Age must be a valid number between 0 and 30 years"
        });
      }
      updateData.age = age;
    }

    if (req.body.price !== undefined) {
      const price = Number(req.body.price);
      if (isNaN(price) || price < 0 || price > 100000) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid number between 0 and 100,000"
        });
      }
      updateData.price = price;
    }

    if (req.body.weight !== undefined) {
      const weight = Number(req.body.weight);
      if (isNaN(weight) || weight < 0.1 || weight > 200) {
        return res.status(400).json({
          success: false,
          message: "Weight must be a valid number between 0.1 and 200 kg"
        });
      }
      updateData.weight = weight;
    }

    // Add image if updated
    if (image !== pet.image) {
      updateData.image = image;
    }

    // Update the pet
    const updatedPet = await Pet.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log("Updated pet:", updatedPet);
    res.json({ 
      success: true, 
      pet: updatedPet,
      message: "Pet updated successfully"
    });

  } catch (err) {
    console.error("Error editing pet:", err);
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

// API to get a single pet by ID
export const getPetById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid pet ID format" 
      });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({ 
        success: false, 
        message: "Pet not found" 
      });
    }

    res.json({ 
      success: true, 
      pet 
    });
  } catch (error) {
    console.error('Error getting pet by ID:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// API to get pet statistics
export const getPetStats = async (req, res) => {
  try {
    const totalPets = await Pet.countDocuments();
    const availablePets = await Pet.countDocuments({ isAdopted: false });
    const adoptedPets = await Pet.countDocuments({ isAdopted: true });
    const adoptionRate = totalPets > 0 ? ((adoptedPets / totalPets) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      totalPets,
      availablePets,
      adoptedPets,
      adoptionRate
    });
  } catch (error) {
    console.error('Error getting pet stats:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// API to mark pet as adopted
export const markPetAsAdopted = async (req, res) => {
  try {
    const { petId, userId } = req.body;
    
    if (!petId) {
      return res.status(400).json({ 
        success: false, 
        message: "Pet ID is required" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid pet ID format" 
      });
    }

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ 
        success: false, 
        message: "Pet not found" 
      });
    }

    if (pet.isAdopted) {
      return res.status(400).json({ 
        success: false, 
        message: "Pet is already adopted" 
      });
    }

    // Mark as adopted
    pet.isAdopted = true;
    pet.adoptionDate = new Date();
    if (userId) {
      pet.adoptedBy = userId;
    }
    
    await pet.save();

    res.json({ 
      success: true, 
      message: "Pet marked as adopted successfully",
      pet: {
        id: pet._id,
        species: pet.species,
        breed: pet.breed,
        adoptionDate: pet.adoptionDate
      }
    });
  } catch (error) {
    console.error('Error marking pet as adopted:', error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const ct = await careTakerModel.findOne({ email: email.toLowerCase().trim() });
    if (!ct) {
      return res.json({ success: false, message: 'Account not found' });
    }

    const ok = await bcrypt.compare(password, ct.password);
    if (!ok) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: ct._id, role: 'caretaker' }, process.env.JWT_SECRET);
    return res.json({ success: true, token });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
}

import Adoption from "../models/Adoption.js";
import Pet from "../models/Pet.js";
import User from "../models/User.js";
import imageKit from "../configs/imageKit.js";
import { promises as fs } from "fs";

//API to create adoption
export const createAdoption = async (req, res) => {
    try {
        const {id} = req.user;
        const { 
            pet, 
            name, 
            date, 
            visit, 
            status, 
            price, 
            address, 
            phone, 
            age, 
            child, 
            reason,
            occupation,
            experience,
            livingSpace,
            otherPets,
            timeCommitment,
            emergencyContact
        } = req.body;

        // Validate required fields
        const requiredFields = {
            pet: "Pet ID is required",
            name: "Name is required",
            address: "Address is required", 
            phone: "Phone number is required",
            age: "Age is required",
            child: "Please select child option",
            reason: "Reason is required",
            occupation: "Occupation is required",
            experience: "Please select experience level",
            livingSpace: "Please select living space type",
            otherPets: "Please specify other pets",
            timeCommitment: "Please select time commitment",
            emergencyContact: "Emergency contact is required"
        };

        for (const [field, message] of Object.entries(requiredFields)) {
            if (!req.body[field]) {
                return res.status(400).json({ success: false, message });
            }
        }

        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is missing" });
        }

        const petData = await Pet.findById(pet);
        if (!petData) {
            return res.status(400).json({ success: false, message: "Pet not found" });
        }

        const userData = await User.findById(id).select("-password");
        if (!userData) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Additional validation for age
        if (age < 18 || age > 100) {
            return res.status(400).json({ 
                success: false, 
                message: "You must be between 18 and 100 years old to adopt" 
            });
        }

        // Validate phone number format
        const phoneRegex = /^(?:0|(?:\+94))7\d{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please enter a valid Sri Lankan phone number" 
            });
        }

        // Validate emergency contact format
        if (!phoneRegex.test(emergencyContact)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please enter a valid emergency contact number" 
            });
        }

        // Validate reason length
        if (reason.trim().length < 10) {
            return res.status(400).json({ 
                success: false, 
                message: "Reason must be at least 10 characters long" 
            });
        }

        // Handle NIC image upload
        let nicImageURL = "";
        if (req.file) {
            try {
                const fileBuffer = await fs.readFile(req.file.path);
                const response = await imageKit.upload({
                    file: fileBuffer,
                    fileName: req.file.originalname,
                    folder: '/adoptions/nic'
                });
                
                // Use direct URL without transformations to avoid 400 errors
                nicImageURL = imageKit.url({
                    path: response.filePath
                });
                

                // Clean up temporary file
                await fs.unlink(req.file.path);
            } catch (imageKitError) {
                console.error("ImageKit error:", imageKitError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload NIC image"
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "NIC image is required"
            });
        }

        const adoptionData = {
            pet: pet,
            user: id,
            name: name.trim(),
            date: new Date(),
            visit: visit,
            status: status || "pending",
            price: price || petData.price,
            address: address.trim(),
            phone: phone,
            age: Number(age),
            child,
            reason: reason.trim(),
            occupation: occupation.trim(),
            experience,
            livingSpace,
            otherPets,
            timeCommitment,
            emergencyContact,
            nicImage: nicImageURL
        };
        
        await Adoption.create(adoptionData);

        // Set isAdopted to true when adoption application is created (pet is reserved)
        await Pet.findByIdAndUpdate(pet, { isAdopted: true }, { runValidators: false });

        res.json({success: true, message: "Adoption application submitted successfully"})
        
    } catch (error) {
        console.log("Adoption creation error:", error.message);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: "Validation failed", 
                errors: errors 
            });
        }
        
        res.status(500).json({success: false, message: "Internal server error"})
    }
}

//API to list Adoptions
export const getUserAdoptions = async (req, res) => {
  console.log("Request user:", req.user);
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.log("User ID missing, req.user:", req.user);
      return res
        .status(400)
        .json({ success: false, message: "User ID is missing" });
    }

    const adoptions = await Adoption.find({ user: userId })
      .populate("pet", "species breed image price")
      .sort({ createdAt: -1 });

    console.log("Fetched adoptions:", adoptions);
    if (!adoptions.length) {
      return res.json({
        success: true,
        message: "No adoptions found for this user",
        adoptions: [],
      });
    }

    res.json({ success: true, adoptions });
  } catch (error) {
    console.error("Get user adoptions error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch adoptions" });
  }
};

//edit adoption
export const editAdoption = async (req, res) => {
  try {
    const { adoptionId } = req.params;
    const userId = req.user.id;
    const { 
      name, 
      address, 
      age, 
      child, 
      reason,
      phone,
      occupation,
      experience,
      livingSpace,
      otherPets,
      timeCommitment,
      emergencyContact
    } = req.body;

    const adoption = await Adoption.findById(adoptionId);
    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    if (adoption.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Validate age
    if (age && (age < 18 || age > 100)) {
      return res.status(400).json({ 
        success: false, 
        message: "You must be between 18 and 100 years old to adopt" 
      });
    }

    // Validate phone number
    const phoneRegex = /^(?:0|(?:\+94))7\d{8}$/;
    if (req.body.phone && !phoneRegex.test(req.body.phone)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid Sri Lankan phone number" 
      });
    }

    // Validate emergency contact
    if (emergencyContact && !phoneRegex.test(emergencyContact)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid emergency contact number" 
      });
    }

    // Validate reason length
    if (reason && reason.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: "Reason must be at least 10 characters long" 
      });
    }

    // Update allowed fields
    if (name) adoption.name = name.trim();
    if (address) adoption.address = address.trim();
    if (age) adoption.age = Number(age);
    if (child) adoption.child = child;
    if (reason) adoption.reason = reason.trim();
    if (phone) adoption.phone = phone;
    if (occupation) adoption.occupation = occupation.trim();
    if (experience) adoption.experience = experience;
    if (livingSpace) adoption.livingSpace = livingSpace;
    if (otherPets) adoption.otherPets = otherPets;
    if (timeCommitment) adoption.timeCommitment = timeCommitment;
    if (emergencyContact) adoption.emergencyContact = emergencyContact;

    await adoption.save();

    res.json({ success: true, message: "Adoption updated successfully", adoption });
  } catch (error) {
    console.error("Error editing adoption:", error.message);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        errors: errors 
      });
    }
    
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//delete adoption
export const deleteAdoption = async (req, res) => {
  try {
    const { adoptionId } = req.params;
    const userId = req.user.id;

    const adoption = await Adoption.findById(adoptionId);
    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    if (adoption.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Pet.findByIdAndUpdate(adoption.pet, { isAdopted: false });

    await adoption.deleteOne();

    res.json({ success: true, message: "Adoption deleted successfully" });
  } catch (error) {
    console.error("Error deleting adoption:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// get single adoption by ID
export const getAdoptionById = async (req, res) => {
  try {
    const { adoptionId } = req.params;

    const adoption = await Adoption.findOne({
      _id: adoptionId,
      user: req.user.id, 
    }).populate('pet');

    if (!adoption) {
      return res.status(404).json({ success: false, message: 'Adoption not found' });
    }

    res.status(200).json({ success: true, adoption });
  } catch (error) {
    console.error('Get adoption error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//API for change isPaid
export const changePaymentStatus = async (req, res) => {
  try {
    const adoptionId = req.params.id;
    const adoption = await Adoption.findById(adoptionId);

    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    adoption.isPaid = true;
    await adoption.save();

    res.json({ success: true, adoption });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
import Adoption from "../models/Adoption.js";
import Pet from "../models/Pet.js";
import User from "../models/User.js";
import imageKit from "../configs/imageKit.js";
import { promises as fs } from "fs";
import mongoose from "mongoose";

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

        // Enhanced validation for required fields
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
            if (!req.body[field] || req.body[field].toString().trim() === '') {
                return res.status(400).json({ success: false, message });
            }
        }

        // Validate ObjectId format for pet
        if (!mongoose.Types.ObjectId.isValid(pet)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid pet ID format" 
            });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: "User ID is missing" });
        }

        const petData = await Pet.findById(pet);
        if (!petData) {
            return res.status(400).json({ success: false, message: "Pet not found" });
        }

        // Check if pet is already adopted
        if (petData.isAdopted) {
            return res.status(400).json({ 
                success: false, 
                message: "This pet is no longer available for adoption" 
            });
        }

        const userData = await User.findById(id).select("-password");
        if (!userData) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        // Check if user already has a pending adoption for this pet
        const existingAdoption = await Adoption.findOne({ 
            user: id, 
            pet: pet, 
            status: { $in: ['pending', 'approved'] } 
        });
        if (existingAdoption) {
            return res.status(400).json({ 
                success: false, 
                message: "You already have a pending or approved adoption for this pet" 
            });
        }

        // Enhanced validation for age
        const ageNum = Number(age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
            return res.status(400).json({ 
                success: false, 
                message: "You must be between 18 and 100 years old to adopt" 
            });
        }

        // Validate name format
        if (!/^[A-Za-z\s]+$/.test(name.trim())) {
            return res.status(400).json({ 
                success: false, 
                message: "Name can only contain letters and spaces" 
            });
        }

        // Validate phone number format
        const phoneRegex = /^(?:0|(?:\+94))7\d{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please enter a valid Sri Lankan phone number (07XXXXXXXX or +947XXXXXXXX)" 
            });
        }

        // Validate emergency contact format
        if (!phoneRegex.test(emergencyContact)) {
            return res.status(400).json({ 
                success: false, 
                message: "Please enter a valid emergency contact number (07XXXXXXXX or +947XXXXXXXX)" 
            });
        }

        // Validate child option
        if (!['no_child', 'below_5', 'above_5'].includes(child)) {
            return res.status(400).json({ 
                success: false, 
                message: "Child option must be no_child, below_5, or above_5" 
            });
        }

        // Validate experience level
        if (!['none', 'beginner', 'intermediate', 'expert'].includes(experience)) {
            return res.status(400).json({ 
                success: false, 
                message: "Experience must be none, beginner, intermediate, or expert" 
            });
        }

        // Validate living space
        if (!['apartment', 'house', 'farm', 'other'].includes(livingSpace)) {
            return res.status(400).json({ 
                success: false, 
                message: "Living space must be apartment, house, farm, or other" 
            });
        }

        // Validate other pets
        if (!['none', 'dogs', 'cats', 'other', 'multiple'].includes(otherPets)) {
            return res.status(400).json({ 
                success: false, 
                message: "Other pets must be none, dogs, cats, other, or multiple" 
            });
        }

        // Validate time commitment
        const validTimeCommitments = ['part_time', 'full_time', 'weekends_only', 'flexible'];
        if (!validTimeCommitments.includes(timeCommitment)) {
            return res.status(400).json({ 
                success: false, 
                message: "Time commitment must be one of: " + validTimeCommitments.join(', ') 
            });
        }

        // Validate reason length and content
        if (reason.trim().length < 10) {
            return res.status(400).json({ 
                success: false, 
                message: "Reason must be at least 10 characters long" 
            });
        }

        if (reason.trim().length > 500) {
            return res.status(400).json({ 
                success: false, 
                message: "Reason cannot exceed 500 characters" 
            });
        }

        // Validate address length
        if (address.trim().length < 5) {
            return res.status(400).json({ 
                success: false, 
                message: "Address must be at least 5 characters long" 
            });
        }

        if (address.trim().length > 200) {
            return res.status(400).json({ 
                success: false, 
                message: "Address cannot exceed 200 characters" 
            });
        }

        // Validate occupation
        if (occupation.trim().length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: "Occupation must be at least 2 characters long" 
            });
        }

        if (occupation.trim().length > 100) {
            return res.status(400).json({ 
                success: false, 
                message: "Occupation cannot exceed 100 characters" 
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

    // Check if adoption can be edited
    if (!adoption.canBeEdited()) {
      return res.status(400).json({ 
        success: false, 
        message: "Only pending adoptions can be edited" 
      });
    }

    // Enhanced validation for age
    if (age !== undefined) {
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        return res.status(400).json({ 
          success: false, 
          message: "You must be between 18 and 100 years old to adopt" 
        });
      }
    }

    // Validate name format
    if (name && !/^[A-Za-z\s]+$/.test(name.trim())) {
      return res.status(400).json({ 
        success: false, 
        message: "Name can only contain letters and spaces" 
      });
    }

    // Validate phone number
    const phoneRegex = /^(?:0|(?:\+94))7\d{8}$/;
    if (phone && !phoneRegex.test(phone)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid Sri Lankan phone number (07XXXXXXXX or +947XXXXXXXX)" 
      });
    }

    // Validate emergency contact
    if (emergencyContact && !phoneRegex.test(emergencyContact)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid emergency contact number (07XXXXXXXX or +947XXXXXXXX)" 
      });
    }

    // Validate child option
    if (child && !['no_child', 'below_5', 'above_5'].includes(child)) {
      return res.status(400).json({ 
        success: false, 
        message: "Child option must be no_child, below_5, or above_5" 
      });
    }

    // Validate experience level
    if (experience && !['none', 'beginner', 'intermediate', 'expert'].includes(experience)) {
      return res.status(400).json({ 
        success: false, 
        message: "Experience must be none, beginner, intermediate, or expert" 
      });
    }

    // Validate living space
    if (livingSpace && !['apartment', 'house', 'farm', 'other'].includes(livingSpace)) {
      return res.status(400).json({ 
        success: false, 
        message: "Living space must be apartment, house, farm, or other" 
      });
    }

    // Validate other pets
    if (otherPets && !['none', 'dogs', 'cats', 'other', 'multiple'].includes(otherPets)) {
      return res.status(400).json({ 
        success: false, 
        message: "Other pets must be none, dogs, cats, other, or multiple" 
      });
    }

    // Validate time commitment
    if (timeCommitment) {
      const validTimeCommitments = ['part_time', 'full_time', 'weekends_only', 'flexible'];
      if (!validTimeCommitments.includes(timeCommitment)) {
        return res.status(400).json({ 
          success: false, 
          message: "Time commitment must be one of: " + validTimeCommitments.join(', ') 
        });
      }
    }

    // Validate reason length
    if (reason) {
      if (reason.trim().length < 10) {
        return res.status(400).json({ 
          success: false, 
          message: "Reason must be at least 10 characters long" 
        });
      }
      if (reason.trim().length > 500) {
        return res.status(400).json({ 
          success: false, 
          message: "Reason cannot exceed 500 characters" 
        });
      }
    }

    // Validate address length
    if (address) {
      if (address.trim().length < 5) {
        return res.status(400).json({ 
          success: false, 
          message: "Address must be at least 5 characters long" 
        });
      }
      if (address.trim().length > 200) {
        return res.status(400).json({ 
          success: false, 
          message: "Address cannot exceed 200 characters" 
        });
      }
    }

    // Validate occupation
    if (occupation) {
      if (occupation.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          message: "Occupation must be at least 2 characters long" 
        });
      }
      if (occupation.trim().length > 100) {
        return res.status(400).json({ 
          success: false, 
          message: "Occupation cannot exceed 100 characters" 
        });
      }
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

//delete adoption with enhanced validation
export const deleteAdoption = async (req, res) => {
  try {
    const { adoptionId } = req.params;
    const userId = req.user.id;

    // Validate adoption ID format
    if (!mongoose.Types.ObjectId.isValid(adoptionId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid adoption ID format" 
      });
    }

    const adoption = await Adoption.findById(adoptionId);
    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    if (adoption.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if adoption can be cancelled
    if (!adoption.canBeCancelled()) {
      return res.status(400).json({ 
        success: false, 
        message: "Only pending or approved adoptions can be cancelled" 
      });
    }

    // Make pet available again
    await Pet.findByIdAndUpdate(adoption.pet, { isAdopted: false });

    await adoption.deleteOne();

    res.json({ 
      success: true, 
      message: "Adoption cancelled successfully",
      cancelledAdoption: {
        id: adoption._id,
        petId: adoption.pet,
        status: adoption.status
      }
    });
  } catch (error) {
    console.error("Error deleting adoption:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// get single adoption by ID
export const getAdoptionById = async (req, res) => {
  try {
    const { adoptionId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(adoptionId)) {
      return res.status(400).json({ success: false, message: "Invalid adoption ID format" });
    }

    const adoption = await Adoption.findById(adoptionId)
      .populate("pet", "species breed image price gender color age weight goodWithKids goodWithPets diet medical born");

    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    return res.status(200).json({ success: true, adoption });
  } catch (error) {
    console.error("Get adoption error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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

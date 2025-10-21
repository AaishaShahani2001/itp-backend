import Adoption from "../models/Adoption.js";
import Pet from "../models/Pet.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import jwt from 'jsonwebtoken';
import fs from 'fs';
import validator from "validator";
import imageKit from "../configs/imageKit.js";
import careTakerModel from "../models/careTakerModel.js";
import doctorModel from "../models/doctorModel.js";

//API to list pets
export const getPets = async (req, res) => {
    try {
        const pets = await Pet.find({pet: _id})

        res.json({success: true, pets})
        
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

//API for dashboard details
export const getDashboardData = async (req, res) => {
  try {
    // Total pets
    const totalPet = await Pet.countDocuments({isAdopted: false});

    // All adoptions
    const allAdoptions = await Adoption.find();

    const totalAdoption = allAdoptions.length;
    const pendingAdoption = allAdoptions.filter(a => a.status === 'pending').length;
    const completedAdoption = allAdoptions.filter(a => a.status === 'completed').length;
    const rejectedAdoption = allAdoptions.filter(a => a.status === 'rejected').length;

    // Revenue: sum of completed adoptions
    const revenue_Adoption = allAdoptions
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        totalPet,
        totalAdoption,
        pendingAdoption,
        completedAdoption,
        rejectedAdoption,
        revenue_Adoption
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

//API for admin login
export const loginAdmin = async (req, res) => {
  try {
    const {email, password} = req.body;

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {

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

//API to list adoptions
export const getAdoptions = async (req, res) => {
  try {
    const adoptions = await Adoption.find().select('_id pet user name date visit status address price phone age child reason occupation experience livingSpace otherPets timeCommitment emergencyContact isPaid nicImage')
    .populate('pet', 'image species breed price');

    if (!adoptions || adoptions.length === 0) {
      return res.status(404).json({ success: false, message: 'No adoptions found' });
    }

    res.json({ success: true, adoptions });

  } catch (error) {
    console.error('Error in getAdoptions:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

//API to change adoption status
export const changeAdoptionStatus = async (req, res) => {
  try {
    const { adoptionId, status, visit } = req.body;
    console.log("Changing adoption status:", { adoptionId, status, visit });
    const adoption = await Adoption.findById(adoptionId).populate("pet");

    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    if (status === "completed" && (!adoption.visit || adoption.status !== "approved")) {
      console.log("Cannot complete adoption:", {
        hasVisit: !!adoption.visit,
        currentStatus: adoption.status,
        requiredStatus: "approved"
      });
      return res.status(400).json({ success: false, message: "Set visit date and approve first" });
    }

    adoption.status = status;
    if (visit) adoption.visit = new Date(visit);

    if ((status === "pending" || status === "approved" || status === "completed") && adoption.pet) {
      // Set isAdopted to true for pending, approved, or completed adoptions (pet is reserved)
      await Pet.findByIdAndUpdate(adoption.pet._id, { isAdopted: true }, { runValidators: false });
    }

    if (status === "rejected" && adoption.pet) {
      // Set isAdopted to false when adoption is rejected so pet becomes available again
      await Pet.findByIdAndUpdate(adoption.pet._id, { isAdopted: false }, { runValidators: false });
    }

    await adoption.save();
    
    // Create website notification based on status change
    try {
      let notification = null;
      
      if (status === "approved" && visit) {
        // Adoption approved with visit date
        notification = new Notification({
          user: adoption.user,
          type: "visit_scheduled",
          title: "Adoption Approved - Visit Scheduled",
          message: `Great news! Your adoption application for ${adoption.pet?.species || 'your pet'} has been approved. Your visit is scheduled for ${new Date(visit).toLocaleDateString()}. Please bring a valid ID and be ready for the adoption process.`,
          adoptionId: adoption._id,
          visitDate: new Date(visit),
          petName: adoption.pet?.species || 'your pet'
        });
      } else if (status === "approved") {
        // Adoption approved without visit date
        notification = new Notification({
          user: adoption.user,
          type: "adoption_approved",
          title: "Adoption Application Approved",
          message: `Congratulations! Your adoption application for ${adoption.pet?.species || 'your pet'} has been approved. We will contact you soon to schedule your visit.`,
          adoptionId: adoption._id,
          petName: adoption.pet?.species || 'your pet'
        });
      } else if (status === "rejected") {
        // Adoption rejected
        notification = new Notification({
          user: adoption.user,
          type: "adoption_rejected",
          title: "Adoption Application Update",
          message: `Thank you for your interest. Unfortunately, your adoption application for ${adoption.pet?.species || 'your pet'} was not approved at this time. We encourage you to apply for other available pets.`,
          adoptionId: adoption._id,
          petName: adoption.pet?.species || 'your pet'
        });
      } else if (status === "completed") {
        // Adoption completed
        notification = new Notification({
          user: adoption.user,
          type: "adoption_completed",
          title: "Adoption Completed Successfully",
          message: `Congratulations! Your adoption of ${adoption.pet?.species || 'your pet'} has been completed successfully. Welcome to the PetPulse family!`,
          adoptionId: adoption._id,
          petName: adoption.pet?.species || 'your pet'
        });
      }
      
      if (notification) {
        await notification.save();
        console.log("Website notification created:", notification.title);
      }
    } catch (notifyError) {
      console.error("Failed to create notification:", notifyError.message);
      // Don't fail the whole request if notification fails
    }
    
    res.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//API for adding doctor
export const addDoctor = async (req, res) => {
  try {
    const {name,email,password,speciality,degree,experience,about,address} = req.body
    const imageFile = req.file

    //check for all data to add doctor
    if(!name || !email || !password || !speciality || !degree || !experience || !about || !address){
      return res.json({success:false,message:"Missing details"})
    }

    //validating email format

    if (!validator.isEmail(email)) {
       return res.json ({success:false,message:"Please enter a valid email"})
      
    }

    // validating strong password
    if (password.length < 8) {
      return res.json ({success:false,message:"Please enter a strong passowrd"})
      
    }


    let imageUrl = "";

    // Upload image to ImageKit if provided
    if (imageFile) {
      // read the uploaded image file
      const fileBuffer = await fs.promises.readFile(imageFile.path);

      // upload to ImageKit
      const uploaded = await imageKit.upload({
        file: fileBuffer, // required
        fileName: imageFile.originalname,
        folder: "/doctor",
      })

      imageUrl = uploaded.url;
    }


    const doctorData = {
      name,
      email: email.toLowerCase().trim(),
      image: imageUrl,
      password: password,
      speciality,
      degree,
      experience,
      about,
      address, // standardized to string in model
      date: Date.now()
    }

    const newDoctor = new doctorModel(doctorData)
    await newDoctor.save()

    res.json({success:true,message:"Doctor added"})



    
  } catch (error) {
    console.log(error)
    res.json({success:false,message:error.message})
  }
};

// API for updating doctor details
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, speciality, degree, experience, about, address } = req.body;
    const imageFile = req.file;

    // find existing doctor
    const doctor = await doctorModel.findById(id);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    // update fields if provided
    if (name) doctor.name = name;
    if (email) {
      if (!validator.isEmail(email)) {
        return res.json({ success: false, message: "Please enter a valid email" });
      }
      doctor.email = email.toLowerCase().trim();
    }

    if (password) {
      if (password.length < 8) {
        return res.json({ success: false, message: "Password must be at least 8 characters" });
      }
      doctor.password = password;
    }

    if (speciality) doctor.speciality = speciality;
    if (degree) doctor.degree = degree;
    if (experience) doctor.experience = experience;
    if (about) doctor.about = about;
    if (address) doctor.address = address;

    // handle new image upload
    if (imageFile) {
      const fileBuffer = await fs.promises.readFile(imageFile.path);

      const uploaded = await imageKit.upload({
        file: fileBuffer,
        fileName: imageFile.originalname,
        folder: "/doctor",
      });

      doctor.image = uploaded.url;
    }

    await doctor.save();

    res.json({ success: true, message: "Doctor updated successfully", doctor });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for deleting a doctor
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await doctorModel.findById(id);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    await doctorModel.findByIdAndDelete(id);

    res.json({ success: true, message: "Doctor deleted successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API for adding caretaker
export const addCareTaker = async (req, res) => {
  try {
    const { name, email, password, speciality, degree, experience, about, address } = req.body;
    const imageFile = req.file;

    // Check for required fields
    if (!name || !email || !password || !experience || !about || !address) {
      return res.json({ success: false, message: "Missing required details" });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email" });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.json({ success: false, message: "Please enter a stronger password (min 8 chars)" });
    }


    let imageUrl = "";

    // Upload image to ImageKit if provided
    if (imageFile) {
      // read the uploaded image file
      const fileBuffer = await fs.promises.readFile(imageFile.path);

      // upload to ImageKit
      const uploaded = await imageKit.upload({
        file: fileBuffer, // required
        fileName: imageFile.originalname,
        folder: "/caretaker",
      });

      imageUrl = uploaded.url;
    }

    // Save new Caretaker to DB
    const careTakerData = {
      name,
      email,
      password: password,
      speciality,
      degree,
      experience,
      about,
      address,
      image: imageUrl,
    };

    const newCareTaker = new careTakerModel(careTakerData);
    await newCareTaker.save();

    res.json({ success: true, message: "Care Taker added successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API for updating caretaker details
export const updateCareTaker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, speciality, degree, experience, about, address } = req.body;
    const imageFile = req.file;

    // Find caretaker
    const careTaker = await careTakerModel.findById(id);
    if (!careTaker) {
      return res.json({ success: false, message: "Caretaker not found" });
    }

    // Update basic fields if provided
    if (name) careTaker.name = name;

    if (email) {
      if (!validator.isEmail(email)) {
        return res.json({ success: false, message: "Please enter a valid email" });
      }
      careTaker.email = email.toLowerCase().trim();
    }

    // Update password if given
    if (password) {
      if (password.length < 8) {
        return res.json({ success: false, message: "Password must be at least 8 characters long" });
      }
      careTaker.password = password;
    }

    if (speciality) careTaker.speciality = speciality;
    if (degree) careTaker.degree = degree;
    if (experience) careTaker.experience = experience;
    if (about) careTaker.about = about;
    if (address) careTaker.address = address;

    // Handle new image upload
    if (imageFile) {
      const fileBuffer = await fs.promises.readFile(imageFile.path);

      const uploaded = await imageKit.upload({
        file: fileBuffer,
        fileName: imageFile.originalname,
        folder: "/caretaker",
      });

      careTaker.image = uploaded.url;
    }

    // Save updates
    await careTaker.save();

    res.json({ success: true, message: "Caretaker updated successfully", careTaker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// API for deleting caretaker
export const deleteCareTaker = async (req, res) => {
  try {
    const { id } = req.params;

    const careTaker = await careTakerModel.findById(id);
    if (!careTaker) {
      return res.json({ success: false, message: "Caretaker not found" });
    }

    await careTakerModel.findByIdAndDelete(id);

    res.json({ success: true, message: "Caretaker deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

//cancel adoption
export const cancelAdoption = async (req, res) => {
  try {
    const { adoptionId } = req.params;

    const adoption = await Adoption.findById(adoptionId);
    if (!adoption) {
      return res.status(404).json({ success: false, message: "Adoption not found" });
    }

    //restore pet adoption status
    await Pet.findByIdAndUpdate(adoption.pet, { isAdopted: false });

    await adoption.deleteOne();

    res.json({ success: true, message: "Adoption deleted successfully" });
  } catch (error) {
    console.error("Error deleting adoption:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // exclude passwords
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found' });
    }
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all reviews for admin
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      reviews 
    });
  } catch (error) {
    console.error("Get all reviews error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ 
        success: false, 
        message: "Review not found" 
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ 
      success: true, 
      message: "Review deleted successfully" 
    });
  } catch (error) {
    console.error("Delete review error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

    // LIST DOCTORS 
export const listDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find().select('-password');
    res.json({ success: true, doctors });
  } catch (error) {
    console.error('List doctors error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//  LIST CARETAKERS 
export const listCaretakers = async (req, res) => {
  try {
    const caretakers = await careTakerModel.find().select('-password');
    res.json({ success: true, caretakers });
  } catch (error) {
    console.error('List caretakers error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

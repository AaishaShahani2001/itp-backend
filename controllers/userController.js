import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Pet from "../models/Pet.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import validator from 'validator'
import imageKit from "../configs/imageKit.js";
import fs from 'fs';
import mongoose from 'mongoose';

//Generate JWT Token
const generateToken = (userId) => {
    const payload = userId;
    return jwt.sign(payload, process.env.JWT_SECRET)
}

//Register User
export const registerUser = async (req, res)=>{
    try {
        const {name, email, password} = req.body

        if (!name || !email || !password) {
            return res.json({success: false, message: 'Fill all the fields.'})
        }

        if (!validator.isEmail(email)) {
            return res.json({success: false, message: 'Enter a valid email.'})
        }

        if (password.length < 8) {
            return res.json({success: false, message: 'Enter a strong password.'})
        }

        const userExists = await User.findOne({email})

        if (userExists) {
            return res.json({success: false, message: 'User already exists'})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        
        const userData = {
            name, email, password: hashedPassword
        }

        const newUser = new User(userData)
        const user = await newUser.save()

        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET)

        res.json({success: true, token})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

//Login User
export const loginUser = async (req, res)=>{
    try {
        const {email, password} = req.body

        const user = await User.findOne({email})

        if (!user) {
            return res.json({success: false, message: "User not found"})
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.json({success: false, message: "Invalid credentials"})
        }

        else {
            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET)
            console.log("UserId : ", user._id)
            return res.json({success: true, token})
        }

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

//Get user data
export const getUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = await User.findById(userId).select('-password');
    if (!userData) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, userData });
  } catch (error) {
    console.error('Get user data error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

//Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, birthday, gender } = req.body;
    const imageFile = req.file;
    const userId = req.user.id; // Use authenticated user ID from middleware

    

    // Prepare update data
    const updateData = { name, phone, address, birthday, gender };

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (imageFile) {
      // Upload to imageKit
      const fileBuffer = await fs.promises.readFile(imageFile.path); // Use promises for async file read

      const response = await imageKit.upload({
        file: fileBuffer,
        fileName: imageFile.originalname,
        folder: '/users',
      });

      // Optimization through imageKit URL transformation
      const optimizedImageURL = imageKit.url({
        path: response.filePath,
        transformation: [
          { width: '400' }, // resizing
          { quality: 'auto' }, // auto compression
          { format: 'webp' }, // convert to webp format
        ],
      });

      // Update image in a single operation (optional, depending on schema)
      await User.findByIdAndUpdate(userId, { image: optimizedImageURL }, { new: true, runValidators: true });
      return res.status(200).json({ success: true, message: 'Profile and image updated' });
    }

    res.status(200).json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' }); // Avoid exposing error details
  } finally {
    // Cleanup: Remove temporary file if it exists
    if (imageFile?.path) {
      fs.promises.unlink(imageFile.path).catch(err => console.error('File cleanup error:', err));
    }
  }
};

// Get my adoptions
export const getPets = async (req, res) => {
    try {
        const pets = await Pet.find()
        res.json({success: true, pets})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Submit a review
export const submitReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, location, rating, testimonial } = req.body;

        // Validate required fields
        if (!name || !location || !rating || !testimonial) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required" 
            });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: "Rating must be between 1 and 5" 
            });
        }

        // Check if user already submitted a review
        const existingReview = await Review.findOne({ user: userId });
        if (existingReview) {
            return res.status(400).json({ 
                success: false, 
                message: "You have already submitted a review" 
            });
        }

        // Get user's profile data to get the image
        const user = await User.findById(userId).select('image');
        
        // Create new review
        const review = new Review({
            user: userId,
            name,
            location,
            userImage: user?.image || null,
            rating,
            testimonial
        });

        await review.save();

        res.json({ 
            success: true, 
            message: "Review submitted successfully",
            review 
        });

    } catch (error) {
        console.error("Submit review error:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

// Get all reviews
export const getReviews = async (req, res) => {
    try {
        console.log("Fetching reviews...");
        
        // Get all reviews with userImage field
        const reviews = await Review.find().sort({ createdAt: -1 });
        console.log("Reviews found:", reviews.length);
        
        res.json({ 
            success: true, 
            reviews: reviews 
        });

    } catch (error) {
        console.error("Get reviews error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error",
            error: error.message 
        });
    }
};

// Get user's own review
export const getMyReview = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("Fetching review for user:", userId);
        
        // Get user's review with userImage field
        const review = await Review.findOne({ user: userId });
        console.log("User review found:", !!review);
        
        res.json({ 
            success: true, 
            review: review 
        });

    } catch (error) {
        console.error("Get my review error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error",
            error: error.message 
        });
    }
};

// Update user's review
export const updateReview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, location, rating, testimonial } = req.body;

        // Validate required fields
        if (!name || !location || !rating || !testimonial) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required" 
            });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: "Rating must be between 1 and 5" 
            });
        }

        const review = await Review.findOne({ user: userId });
        
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: "Review not found" 
            });
        }

        // Get user's current image
        const user = await User.findById(userId).select('image');
        
        // Update review
        review.name = name;
        review.location = location;
        review.userImage = user?.image || review.userImage;
        review.rating = rating;
        review.testimonial = testimonial;

        await review.save();

        res.json({ 
            success: true, 
            message: "Review updated successfully",
            review 
        });

    } catch (error) {
        console.error("Update review error:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

// Delete user's review
export const deleteReview = async (req, res) => {
    try {
        const userId = req.user.id;

        const review = await Review.findOne({ user: userId });
        
        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: "Review not found" 
            });
        }

        await Review.findByIdAndDelete(review._id);

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

// Get user notifications
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('adoptionId', 'pet status')
            .populate('adoptionId.pet', 'species breed image');

        const total = await Notification.countDocuments({ user: userId });
        
        res.json({
            success: true,
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Get unread notification count
export const getUnreadNotificationCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await Notification.countDocuments({ user: userId, isRead: false });
        
        res.json({ success: true, count });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const notification = await Notification.findOne({ _id: notificationId, user: userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        notification.isRead = true;
        await notification.save();
        
        res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await Notification.updateMany(
            { user: userId, isRead: false },
            { isRead: true }
        );
        
        res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Delete notification
export const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const notification = await Notification.findOne({ _id: notificationId, user: userId });
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        await Notification.findByIdAndDelete(notificationId);
        res.json({ success: true, message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
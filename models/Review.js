import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    name: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    userImage: {
        type: String,
        trim: true
    },
    rating: {
        type: Number
    },
    testimonial: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;

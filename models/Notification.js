import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["adoption_approved", "adoption_rejected", "visit_scheduled", "adoption_completed", "general"],
        default: "general"
    },
    title: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        trim: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    adoptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Adoption",
        default: null
    },
    visitDate: {
        type: Date,
        default: null
    },
    petName: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

// Also export as named export for compatibility
export { Notification };

import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const adoptionSchema = new mongoose.Schema({
    pet: {
        type: ObjectId, 
        ref: "Pet",
        required: [true, 'Pet ID is required'],
        validate: {
            validator: function(v) {
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: 'Invalid pet ID format'
        }
    },
    user: {
        type: ObjectId, 
        ref: "User",
        required: [true, 'User ID is required'],
        validate: {
            validator: function(v) {
                return mongoose.Types.ObjectId.isValid(v);
            },
            message: 'Invalid user ID format'
        }
    },
    name: {
        type: String, 
        trim: true,
        required: [true, 'Name is required'],
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters'],
        validate: {
            validator: function(v) {
                return /^[A-Za-z\s]+$/.test(v);
            },
            message: 'Name can only contain letters and spaces'
        }
    },
    date: {
        type: Date,
        default: Date.now,
        validate: {
            validator: function(v) {
                return v <= new Date();
            },
            message: 'Adoption date cannot be in the future'
        }
    },
    visit: {
        type: Date, 
        default: null,
        validate: {
            validator: function(v) {
                return !v || v >= new Date();
            },
            message: 'Visit date cannot be in the past'
        }
    },
    status: {
        type: String, 
        enum: {
            values: ["pending", "approved", "rejected", "completed"],
            message: 'Status must be pending, approved, rejected, or completed'
        },
        default: "pending"
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
        max: [100000, 'Price cannot exceed 100,000']
    },
    address: {
        type: String, 
        trim: true,
        required: [true, 'Address is required'],
        minlength: [5, 'Address must be at least 5 characters'],
        maxlength: [200, 'Address cannot exceed 200 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function(v) {
                return /^(?:0|(?:\+94))7\d{8}$/.test(v);
            },
            message: 'Please enter a valid Sri Lankan phone number (07XXXXXXXX or +947XXXXXXXX)'
        }
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [18, 'You must be at least 18 years old to adopt'],
        max: [100, 'Age cannot exceed 100 years']
    },
    child: {
        type: String,
        required: [true, 'Child option is required'],
        enum: {
            values: ['no_child', 'below_5', 'above_5'],
            message: 'Child option must be no_child, below_5, or above_5'
        }
    },
    reason: {
        type: String, 
        trim: true,
        required: [true, 'Reason is required'],
        minlength: [10, 'Reason must be at least 10 characters'],
        maxlength: [500, 'Reason cannot exceed 500 characters']
    },
    occupation: {
        type: String, 
        trim: true,
        required: [true, 'Occupation is required'],
        minlength: [2, 'Occupation must be at least 2 characters'],
        maxlength: [100, 'Occupation cannot exceed 100 characters']
    },
    experience: {
        type: String,
        required: [true, 'Experience level is required'],
        enum: {
            values: ['none', 'beginner', 'intermediate', 'expert'],
            message: 'Experience must be none, beginner, intermediate, or expert'
        }
    },
    livingSpace: {
        type: String,
        required: [true, 'Living space type is required'],
        enum: {
            values: ['apartment', 'house', 'farm', 'other'],
            message: 'Living space must be apartment, house, farm, or other'
        }
    },
    otherPets: {
        type: String,
        required: [true, 'Other pets information is required'],
        enum: {
            values: ['none', 'dogs', 'cats', 'other', 'multiple'],
            message: 'Other pets must be none, dogs, cats, other, or multiple'
        }
    },
    timeCommitment: {
        type: String,
        required: [true, 'Time commitment is required'],
        enum: {
            values: ['part_time', 'full_time', 'weekends_only', 'flexible'],
            message: 'Time commitment must be part_time, full_time, weekends_only, or flexible'
        }
    },
    emergencyContact: {
        type: String, 
        trim: true,
        required: [true, 'Emergency contact is required'],
        validate: {
            validator: function(v) {
                return /^(?:0|(?:\+94))7\d{8}$/.test(v);
            },
            message: 'Please enter a valid emergency contact number (07XXXXXXXX or +947XXXXXXXX)'
        }
    },
    isPaid: {
        type: Boolean, 
        default: false
    },
    nicImage: {
        type: String, 
        trim: true,
        required: [true, 'NIC image is required'],
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
            },
            message: 'NIC image must be a valid URL ending with jpg, jpeg, png, or webp'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Virtual for adoption duration
adoptionSchema.virtual('adoptionDuration').get(function() {
    if (this.date) {
        const now = new Date();
        const diffTime = Math.abs(now - this.date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    return 0;
});

// Virtual for status display
adoptionSchema.virtual('statusDisplay').get(function() {
    const statusMap = {
        'pending': 'Under Review',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'completed': 'Completed'
    };
    return statusMap[this.status] || this.status;
});

// Indexes for better query performance
adoptionSchema.index({ user: 1 });
adoptionSchema.index({ pet: 1 });
adoptionSchema.index({ status: 1 });
adoptionSchema.index({ date: -1 });
adoptionSchema.index({ createdAt: -1 });

// Pre-save middleware for additional validation
adoptionSchema.pre('save', function(next) {
    // Ensure price is rounded to 2 decimal places
    if (this.price) {
        this.price = Math.round(this.price * 100) / 100;
    }
    
    // Ensure phone numbers are properly formatted
    if (this.phone && !this.phone.startsWith('+94')) {
        this.phone = this.phone.replace(/^0/, '+94');
    }
    
    if (this.emergencyContact && !this.emergencyContact.startsWith('+94')) {
        this.emergencyContact = this.emergencyContact.replace(/^0/, '+94');
    }
    
    next();
});

// Static method to find adoptions by status
adoptionSchema.statics.findByStatus = function(status) {
    return this.find({ status: status });
};

// Static method to find user adoptions
adoptionSchema.statics.findByUser = function(userId) {
    return this.find({ user: userId });
};

// Instance method to check if adoption can be edited
adoptionSchema.methods.canBeEdited = function() {
    return this.status === 'pending';
};

// Instance method to check if adoption can be cancelled
adoptionSchema.methods.canBeCancelled = function() {
    return ['pending', 'approved'].includes(this.status);
};

const Adoption = mongoose.model('Adoption', adoptionSchema)

export default Adoption;
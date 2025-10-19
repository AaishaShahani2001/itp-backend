import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const petSchema = new mongoose.Schema({
    species: {
        type: String, 
        trim: true,
        required: [true, 'Species is required'],
        enum: {
            values: ['Dog', 'Cat', 'Rabbit', 'Parrot', 'Bird', 'Fish', 'Hamster', 'Guinea Pig', 'Pigeon', 'Other'],
            message: 'Species must be one of: Dog, Cat, Rabbit, Parrot, Bird, Fish, Hamster, Guinea Pig, Pigeon, Other'
        }
    },
    breed: {
        type: String, 
        trim: true,
        required: [true, 'Breed is required'],
        minlength: [2, 'Breed must be at least 2 characters'],
        maxlength: [50, 'Breed cannot exceed 50 characters'],
        validate: {
            validator: function(v) {
                return /^[A-Za-z\s]+$/.test(v);
            },
            message: 'Breed can only contain letters and spaces'
        }
    },
    gender: {
        type: String, 
        trim: true,
        required: [true, 'Gender is required'],
        enum: {
            values: ['Male', 'Female', 'male', 'female'],
            message: 'Gender must be either Male or Female'
        }
    },
    color: {
        type: String, 
        trim: true,
        required: [true, 'Color is required'],
        minlength: [2, 'Color must be at least 2 characters'],
        maxlength: [30, 'Color cannot exceed 30 characters'],
        validate: {
            validator: function(v) {
                return /^[A-Za-z\s]+$/.test(v);
            },
            message: 'Color can only contain letters and spaces'
        }
    },
    diet: {
        type: String, 
        trim: true,
        required: [true, 'Diet information is required'],
        minlength: [3, 'Diet information must be at least 3 characters'],
        maxlength: [100, 'Diet information cannot exceed 100 characters']
    },
    image: {
        type: String, 
        trim: true,
        required: [true, 'Pet image is required'],
        validate: {
            validator: function(v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
            },
            message: 'Image must be a valid URL ending with jpg, jpeg, png, or webp'
        }
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [0, 'Age cannot be negative'],
        max: [30, 'Age cannot exceed 30 years'],
        validate: {
            validator: function(v) {
                return Number.isInteger(v);
            },
            message: 'Age must be a whole number'
        }
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
        max: [100000, 'Price cannot exceed 100,000']
    },
    medical: {
        type: String, 
        trim: true,
        required: [true, 'Medical information is required'],
        minlength: [5, 'Medical information must be at least 5 characters'],
        maxlength: [500, 'Medical information cannot exceed 500 characters']
    },
    born: {
        type: String, 
        trim: true,
        required: [true, 'Birth information is required'],
        validate: {
            validator: function(v) {
                // Check YYYY-MM-DD format
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
                const date = new Date(v);
                const today = new Date();
                const minDate = new Date('1900-01-01');
                return !isNaN(date.getTime()) && date <= today && date >= minDate;
            },
            message: 'Birth date must be in YYYY-MM-DD format, not before 1900, and not in the future'
        }
    },
    weight: {
        type: Number,
        required: [true, 'Weight is required'],
        min: [0.1, 'Weight must be at least 0.1 kg'],
        max: [200, 'Weight cannot exceed 200 kg']
    },
    goodWithKids: {
        type: String,
        trim: true,
        required: [true, 'Good with kids information is required'],
        enum: {
            values: ['Yes', 'No', 'Unknown'],
            message: 'Good with kids must be Yes, No, or Unknown'
        }
    },
    goodWithPets: {
        type: String,
        trim: true,
        required: [true, 'Good with pets information is required'],
        enum: {
            values: ['Yes', 'No', 'Unknown'],
            message: 'Good with pets must be Yes, No, or Unknown'
        }
    },
    isAdopted: { 
        type: Boolean, 
        default: false 
    },
    adoptionDate: {
        type: Date,
        default: null
    },
    adoptedBy: {
        type: ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

// Virtual for pet age in months
petSchema.virtual('ageInMonths').get(function() {
    return Math.round(this.age * 12);
});

// Virtual for adoption status
petSchema.virtual('adoptionStatus').get(function() {
    return this.isAdopted ? 'Adopted' : 'Available';
});

// Indexes for better query performance
petSchema.index({ species: 1 });
petSchema.index({ breed: 1 });
petSchema.index({ isAdopted: 1 });
petSchema.index({ price: 1 });
petSchema.index({ age: 1 });
petSchema.index({ createdAt: -1 });

// Pre-save middleware for additional validation
petSchema.pre('save', function(next) {
    // Ensure price is rounded to 2 decimal places
    if (this.price) {
        this.price = Math.round(this.price * 100) / 100;
    }
    
    // Ensure weight is rounded to 1 decimal place
    if (this.weight) {
        this.weight = Math.round(this.weight * 10) / 10;
    }
    
    next();
});

// Static method to find available pets
petSchema.statics.findAvailable = function() {
    return this.find({ isAdopted: false });
};

// Static method to find adopted pets
petSchema.statics.findAdopted = function() {
    return this.find({ isAdopted: true });
};

// Static method to find pets by species
petSchema.statics.findBySpecies = function(species) {
    return this.find({ species: new RegExp(species, 'i'), isAdopted: false });
};

// Instance method to mark as adopted
petSchema.methods.markAsAdopted = function(userId) {
    this.isAdopted = true;
    this.adoptionDate = new Date();
    this.adoptedBy = userId;
    return this.save();
};

const Pet = mongoose.model("Pet", petSchema)

export default Pet;
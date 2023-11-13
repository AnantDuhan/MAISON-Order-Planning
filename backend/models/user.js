const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

mongoose.set('strictQuery', false);

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please Enter Your Name'],
        maxLength: [30, 'Name cannot exceed 30 characters'],
        minLength: [2, 'Name must be atleast of 2 characters long']
    },
    email: {
        type: String,
        required: [true, 'Please Enter Your Email'],
        unique: true,
        validate: [validator.isEmail, 'Please Enter a valid Email']
    },
    password: {
        type: String,
        required: [true, 'Please Enter Your Password'],
        minLength: [6, 'Password must be atleast of 6 characters long'],
        select: false
    },
    whatsappNumber: {
        type: Number,
        required: true,
        unique: [true, 'This number is already in use by another account!']
    },
    otp: {
        code: {
            type: Number,
            select: false
        },
        expiry: Date
    },
    avatar: {
        type: String,
        required: true
    },
    wishlist: {
        type: [
            {
                name: {
                    type: String,
                    required: [true, 'Please Enter product Name'],
                    trim: true
                },
                description: {
                    type: String,
                    required: [true, 'Please Enter product description']
                },
                price: {
                    type: Number,
                    required: [true, 'Please Enter product price'],
                    maxLength: [6, "Price can't exceed 6 figures"]
                },
                ratings: {
                    type: Number,
                    default: 0
                },
                images: [
                    {
                        url: {
                            type: String,
                            required: true
                        }
                    }
                ],
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product'
                }
            }
        ],
        default: []
    },
    stripeCustomerId: String,
    plusSubscriptionId: String,
    plusSubscriptionExpiry: Date,
    role: {
        type: String,
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 12);
});

// jwt token
userSchema.methods.getJWTToken = function () {
    return jwt.sign(
        {
            id: this._id,
        },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );
};

// compare Password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// generating password reset token
userSchema.methods.getResetPasswordToken = function () {
    // generating token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // hashing and add to userSchema
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);

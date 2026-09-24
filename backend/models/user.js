const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
mongoose.set('strictQuery', false);

const userSchema = new mongoose.Schema({
    _id: String,
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
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please Enter a valid Email']
    },
    password: {
        type: String,
        minLength: [6, 'Password must be atleast of 6 characters long'],
        select: false
    },
    // sparse: users without a number (e.g. Google sign-ups) must not collide
    // on a shared "null" key. Existing deployments need the old index
    // dropped once: db.users.dropIndex('whatsappNumber_1')
    whatsappNumber: {
        type: Number,
        unique: [true, 'This number is already in use by another account!'],
        sparse: true
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    avatar: {
        type: String,
        required: true
    },
    wishlist: {
        type: [
            {
                _id: String,
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
                        _id: String,
                        url: {
                            type: String,
                            required: true
                        }
                    }
                ],
                product: {
                    type: String,
                    ref: 'Product'
                }
            }
        ],
        default: []
    },
    twoFactorAuth: {
        secret: {
            type: String,
            select: false,
        },
        tempSecret: { 
            type: String,
            select: false,
        },
        enabled: {
            type: Boolean,
            default: false,
        }
    },
    role: {
        type: String,
        default: 'user'
    },
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    },
    demoRestrictions: {
        canPlaceOrders: { type: Boolean, default: false },
        canSubmitReviews: { type: Boolean, default: false },
        canChangeEmail: { type: Boolean, default: false },
        canChangePassword: { type: Boolean, default: false }
    },
    addresses: {
        type: [
            {
                _id: String,
                label: { type: String, trim: true, default: '' },
                address: { type: String, required: true },
                city: { type: String, required: true },
                state: { type: String, required: true },
                country: { type: String, required: true },
                pinCode: { type: Number, required: true },
                phoneNumber: { type: Number, required: true }
            }
        ],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    pushToken: {
        type: String,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Sessions issued before this moment are rejected by isAuthUser.
    passwordChangedAt: {
        type: Date,
        select: false
    },

    emailVerificationToken: {
        type: String,
        select: false
    },
    emailVerificationExpire: {
        type: Date,
        select: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
});

// Never serialise secrets, even when a query explicitly selected them.
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpire;
        delete ret.passwordChangedAt;
        if (ret.twoFactorAuth) {
            delete ret.twoFactorAuth.secret;
            delete ret.twoFactorAuth.tempSecret;
        }
        return ret;
    }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) {
        this.passwordChangedAt = new Date();
    }
});

// jwt token
userSchema.methods.getJWTToken = function () {
    return jwt.sign(
        {
            id: this._id
        },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );
};

// compare Password
userSchema.methods.comparePassword = async function (enteredPassword) {
    // Google-only accounts have no password; also guards against a query
    // that forgot to select('+password').
    if (!this.password || typeof enteredPassword !== 'string') return false;
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

userSchema.methods.getEmailVerificationToken = function () {
    const verificationToken = crypto.randomBytes(32).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    // Token valid for 24 hours
    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

    return verificationToken;
};

module.exports = mongoose.model('User', userSchema);

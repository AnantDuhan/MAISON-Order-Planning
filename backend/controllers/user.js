// const { s3 } = require('../app');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'backend/config/config.env' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
const Snowflake = require('@theinternetfolks/snowflake');
const { OAuth2Client } = require('google-auth-library');
const twilio = require('twilio');
const validator = require('validator'); 
const ejs = require('ejs');
const path = require('path');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const optclient = twilio(accountSid, authToken);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

// register user
exports.registerUser = async (req, res, next) => {
    try {
        const { name, whatsappNumber, email, password } = req.body;
        const file = req.file;

        if (!file) {
            res.status(400).send('No file uploaded.');
            return;
        }

        const s3 = new S3Client({
            region: process.env.AWS_BUCKET_REGION,
            credentials: fromEnv()
        });

        // Define the upload parameters
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: file.originalname, 
            Body: file.buffer
        };

        // Upload the file to S3
        const uploadCommand = new PutObjectCommand(uploadParams);
        await s3.send(uploadCommand);

        const cacheBuster = Date.now();
        const avatarUrl = `https://${uploadParams.Bucket}.s3.${s3.region}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

        console.log('✅ Image uploaded successfully:', avatarUrl);

        const customer = await stripe.customers.create({
            email,
            source: 'tok_visa'
        });

        const user = await User.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            name,
            whatsappNumber,
            email,
            password,
            avatar: avatarUrl,
            stripeCustomerId: customer.id
        });

        let token = jwt.sign(
            {
                userId: user._id,
                name: user.name,
                email: user.email
            },
            process.env.JWT_SECRET_KEY
        );

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        const finalToken = user.getJWTToken();
        res.status(201).cookie('token', token, options).json({
            success: true,
            user,
            token: finalToken
        });
    } catch (err) {
        console.error('⚠️ Error:', err);
        res.status(500).json({
            success: false,
            message: '⚠️ Error: ' + err.message
        });
    }
};

// Login User
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // checking if user has given email and password both
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please Enter Email and Password'
            });
        }

        const user = await User.findOne({ email }).select('+password +twoFactorAuth.enabled');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Email or Password'
            });
        }

        if (user.twoFactorAuth.enabled) {
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                userId: user._id,
            });
        }

        const isPasswordMatched = await user.comparePassword(password);
        if (!isPasswordMatched) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Email or Password'
            });
        }

        let token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            },
            process.env.JWT_SECRET_KEY
        );

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        res.status(201).cookie('token', token, options).json({
            success: true,
            user
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// logout User
exports.logout = async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        message: 'User logged out'
    });
};

// forgot password
exports.forgotPassword = async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // get reset password token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const resetPasswordURL = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    try {
        await sendEmail({
            email: user.email,
            subject: `Password Recovery - Ecommerce`,
            html: `Your password reset token is:- \n\n ${resetPasswordURL} \n\n If you have not requested this email then, please ignore it.`
        });

        const message = `Your password reset token is:- \n\n ${resetPasswordURL} \n\n If you have not requested this email then, please ignore it.`;

        console.log('message', message);

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully.`
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// reset password
exports.resetPassword = async (req, res, next) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Reset Password Token is invalid or has expired!'
            });
        }

        if (req.body.password !== req.body.confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match!'
            });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        // Generate a new JWT token
        let token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            },
            process.env.JWT_SECRET_KEY
        );

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        res.status(200).cookie('token', token, options).json({
            success: true,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// get User details
exports.getUserDetails = async (req, res, next) => {
    const user = await User.findById(req.user._id);

    res.status(200).json({
        success: true,
        user
    });
};

// update User password
exports.updatePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        const isPasswordMatched = await user.comparePassword(
            req.body.oldPassword
        );

        if (!isPasswordMatched) {
            return res.status(400).json({
                success: false,
                message: 'Old Password is incorrect'
            });
        }

        if (req.body.newPassword !== req.body.confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password does not match'
            });
        }

        user.password = req.body.newPassword;

        await user.save();

        let token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            },
            process.env.JWT_SECRET_KEY
        );

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        res.status(200).cookie('token', token, options).json({
            success: true,
            user
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// get all users --admin
exports.getAllUsers = async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        users
    });
};

// get single user --admin
exports.getSingleUser = async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(400).json({
            success: false,
            message: `User does not exist with Id: ${req.params.id}`
        });
    }

    res.status(200).json({
        success: true,
        user
    });
};

// update User Role --admin
exports.updateUserRole = async (req, res, next) => {
    try {
        const newUserData = {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role
        };
        const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.googleLogin = async (req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'Google ID token is required'
            });
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                _id: Snowflake.Snowflake.generate({ timestamp: timestampInSeconds }),
                name,
                email,
                avatar: picture,
                authProvider: 'google'
            });
        }

        let token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            },
            process.env.JWT_SECRET_KEY
        );

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        res.status(200).cookie('token', token, options).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('🔐 Google login error: ', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

exports.sendLoginOtp = async (req, res, next) => {
    try {
        const identifier = String(req.body.identifier || req.body.whatsappNumber || '');

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Please enter your Email or WhatsApp number'
            });
        }

        let user;
        const isEmail = validator.isEmail(identifier);

        // Step 1: Find the user first.
        if (isEmail) {
            user = await User.findOne({ email: identifier });
        } else {
            const numberIdentifier = parseInt(identifier, 10);
            if (!isNaN(numberIdentifier)) {
                user = await User.findOne({ whatsappNumber: numberIdentifier });
            }
        }

        // Step 2: Check if the user was found.
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Step 3: Now that we have a user, generate and assign the OTP.
        const otp = crypto.randomInt(100000, 1000000);
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
        
        user.otp = {
            code: otp,
            expiry: otpExpiry
        };
        
        await user.save({ validateBeforeSave: false });

        // Step 4: Send the email or SMS.
        if (isEmail) {
            const html = await ejs.renderFile(
                path.join(__dirname, '../mails/activation-mail.ejs'),
                { name: user.name, otp: otp }
            );
            await sendEmail({
                email: user.email,
                subject: 'Your E-Commerce Login OTP',
                html: html,
            });
            res.status(200).json({
                success: true,
                message: `OTP sent to ${user.email}`,
            });
        } else {
            if (!user.whatsappNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'No WhatsApp number is associated with this account.'
                });
            }
            await optclient.messages.create({
                body: `Your E-Commerce login OTP is: ${otp}`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `${user.whatsappNumber}`,
            });
            res.status(200).json({
                success: true,
                message: `OTP sent to ${user.whatsappNumber}`,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'An internal server error occurred.'
        });
    }
};



exports.verifyLoginOtp = async (req, res, next) => {
    // Use 'identifier' to accept both email and number
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Please provide an identifier and OTP'
        });
    }

    let user;
    const isEmail = validator.isEmail(identifier);

    // Find the user by the correct identifier and select the OTP fields
    if (isEmail) {
        user = await User.findOne({ email: identifier }).select('+otp.code +otp.expiry');
    } else {
        user = await User.findOne({ whatsappNumber: identifier }).select('+otp.code +otp.expiry');
    }

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    if (!user.otp || !user.otp.code) {
        return res.status(400).json({
            success: false,
            message: 'OTP not requested or already used'
        });
    }

    if (user.otp.expiry < Date.now()) {
        return res.status(400).json({
            success: false,
            message: 'OTP has expired'
        });
    }

    if (user.otp.code !== Number(otp)) {
        return res.status(400).json({
            success: false,
            message: 'Incorrect OTP'
        });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    await user.save({ validateBeforeSave: false });

    const token = user.getJWTToken();

    res.status(200).json({
        success: true,
        token,
        user,
    });
};

exports.setupTwoFactorAuth = async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+twoFactorAuth.tempSecret');

    const secret = speakeasy.generateSecret({
        name: `Order Planning - (${user.email})`,
    });

    user.twoFactorAuth.tempSecret = secret.base32;
    await user.save({ validateBeforeSave: false });

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) {
            return next(new ErrorHandler('Error generating QR code', 500));
        }
        res.status(200).json({
            success: true,
            qrCodeUrl: data_url,
        });
    });
};

exports.verifyTwoFactorAuth = async (req, res, next) => {
    const { token } = req.body;
    const user = await User.findById(req.user.id).select('+twoFactorAuth.tempSecret +twoFactorAuth.secret');

    const isVerified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.tempSecret,
        encoding: 'base32',
        token,
    });

    if (!isVerified) {
        return next(new ErrorHandler('Invalid 2FA token', 400));
    }

    user.twoFactorAuth.secret = user.twoFactorAuth.tempSecret;
    user.twoFactorAuth.tempSecret = undefined; // Clear temp secret
    user.twoFactorAuth.enabled = true;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        message: '2FA enabled successfully',
    });
};

exports.disableTwoFactorAuth = async (req, res, next) => {
    const user = await User.findById(req.user.id);

    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.secret = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        message: '2FA disabled successfully',
    });
};

exports.validateTfaToken = async (req, res, next) => {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select('+twoFactorAuth.secret');

    if (!user || !user.twoFactorAuth.secret) {
        return next(new ErrorHandler('Invalid request', 400));
    }

    const isVerified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token,
    });

    if (!isVerified) {
        return next(new ErrorHandler('Invalid 2FA token', 400));
    }

    // If token is valid, now we generate and send the final JWT
    const finalToken = user.getJWTToken();
    res.status(200).json({
        success: true,
        token: finalToken,
    });
};
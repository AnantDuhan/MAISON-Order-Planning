// const { s3 } = require('../app');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail');
const { sendEmailInBackground } = require('../utils/sendEmail');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'backend/config/config.env' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
const generateId = require('../utils/generateId');
const { OAuth2Client } = require('google-auth-library');
const validator = require('validator'); 
const ejs = require('ejs');
const path = require('path');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

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
        const avatarUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

        console.log('✅ Image uploaded successfully:', avatarUrl);

        const user = await User.create({
            _id: generateId(),
            name,
            whatsappNumber,
            email,
            password,
            avatar: avatarUrl
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
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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

        // Verify the password FIRST. 2FA is a SECOND factor on top of the
        // password — never a replacement for it.
        const isPasswordMatched = await user.comparePassword(password);
        if (!isPasswordMatched) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Email or Password'
            });
        }

        // Password OK. If 2FA is enabled, don't issue the session yet — require
        // the authenticator code. Bind that step to this successful password
        // check with a short-lived pending token.
        if (user.twoFactorAuth.enabled) {
            const twoFactorToken = jwt.sign(
                { id: user._id, twoFactorPending: true },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '5m' }
            );
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                twoFactorToken,
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
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.status(200).json({
        success: true,
        message: 'User logged out'
    });
};

// forgot password
exports.forgotPassword = async (req, res, next) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        const user = await User.findOne({ email });

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
        const emailMessage = await ejs.renderFile(
            path.join(__dirname, '../mails/forgot-password.ejs'),
            {
                name: user.name,
                activationCode: resetPasswordURL
            }
        );

        sendEmailInBackground({
            email: user.email,
            subject: `Password Recovery - Ecommerce`,
            html: emailMessage
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully.`
        });
    } catch (error) {
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
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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

// update User profile
exports.registerPushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;

        await User.findByIdAndUpdate(req.user._id, { pushToken: pushToken || null });

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to register push token',
            error: error.message
        });
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.name = req.body.name;
        user.email = req.body.email;

        if (req.file) {
            const s3 = new S3Client({
                region: process.env.AWS_BUCKET_REGION,
                credentials: fromEnv()
            });
            const uploadParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: req.file.originalname,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            };

            await s3.send(new PutObjectCommand(uploadParams));
            user.avatar = `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${Date.now()}`;
        }

        await user.save();

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
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
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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
        const { email, name, picture, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                _id: generateId(),
                name,
                email,
                avatar: picture,
                authProvider: 'google',
                googleId
            });
        }

        let token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '90d' }
        );

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        };

        res.status(200).cookie('token', token, options).json({
            success: true,
            user,
            token
        });
    } catch (error) {
        console.error('🔐 Google login error: ', error.message);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired Google Token'
        });
    }
};
// ---------------------------------------------------------------------------
// Address book — saved shipping addresses on the user profile.
// Shape mirrors an order's shippingInfo so a saved address drops straight in.
// ---------------------------------------------------------------------------

// GET /api/v1/addresses
exports.getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, addresses: user.addresses || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch addresses', error: error.message });
    }
};

// POST /api/v1/address/new
exports.addAddress = async (req, res) => {
    try {
        const { label, address, city, state, country, pinCode, phoneNumber } = req.body;

        if (!address || !city || !state || !country || !pinCode || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'address, city, state, country, pinCode and phoneNumber are required'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const normalize = value => String(value ?? '').trim().toLowerCase();
        const duplicate = (user.addresses || []).some(saved =>
            normalize(saved.address) === normalize(address) &&
            normalize(saved.city) === normalize(city) &&
            normalize(saved.state) === normalize(state) &&
            normalize(saved.country) === normalize(country) &&
            normalize(saved.pinCode) === normalize(pinCode) &&
            normalize(saved.phoneNumber) === normalize(phoneNumber)
        );

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'This address is already saved'
            });
        }

        user.addresses.push({
            _id: generateId(),
            label: label || '',
            address,
            city,
            state,
            country,
            pinCode,
            phoneNumber
        });

        await user.save({ validateBeforeSave: false });

        res.status(201).json({ success: true, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to save address', error: error.message });
    }
};

// DELETE /api/v1/address/:addressId
exports.deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const before = user.addresses.length;
        user.addresses = user.addresses.filter(a => String(a._id) !== String(req.params.addressId));

        if (user.addresses.length === before) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete address', error: error.message });
    }
};

// ===================== Two-Factor Authentication (TOTP) =====================

// Issue the authenticated session cookie (shared by login completion).
const issueSession = (user, res, statusCode = 200) => {
    const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
        process.env.JWT_SECRET_KEY
    );
    const options = {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };
    return res.status(statusCode).cookie('token', token, options).json({ success: true, user });
};

// Begin setup: create a secret, stash it as a TEMP secret (not yet active),
// and return a QR code the user scans in their authenticator app.
exports.setupTwoFactorAuth = async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ name: `Maison (${req.user.email})` });
        await User.findByIdAndUpdate(req.user._id, {
            'twoFactorAuth.tempSecret': secret.base32,
        });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);
        res.status(200).json({ success: true, qrCode, secret: secret.base32 });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Confirm setup: verify a code against the temp secret, then activate 2FA.
exports.verifyTwoFactorAuth = async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user._id).select('+twoFactorAuth.tempSecret');
        if (!user?.twoFactorAuth?.tempSecret) {
            return res.status(400).json({ success: false, message: 'Start 2FA setup first' });
        }
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorAuth.tempSecret,
            encoding: 'base32',
            token: String(code || ''),
            window: 1,
        });
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid authentication code' });
        }
        user.twoFactorAuth.secret = user.twoFactorAuth.tempSecret;
        user.twoFactorAuth.tempSecret = undefined;
        user.twoFactorAuth.enabled = true;
        await user.save({ validateBeforeSave: false });
        res.status(200).json({ success: true, message: 'Two-factor authentication enabled' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Disable 2FA — requires a current valid code so a hijacked session can't turn it off.
exports.disableTwoFactorAuth = async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user._id).select('+twoFactorAuth.secret +twoFactorAuth.enabled');
        if (!user?.twoFactorAuth?.enabled) {
            return res.status(400).json({ success: false, message: '2FA is not enabled' });
        }
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorAuth.secret,
            encoding: 'base32',
            token: String(code || ''),
            window: 1,
        });
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid authentication code' });
        }
        user.twoFactorAuth.secret = undefined;
        user.twoFactorAuth.tempSecret = undefined;
        user.twoFactorAuth.enabled = false;
        await user.save({ validateBeforeSave: false });
        res.status(200).json({ success: true, message: 'Two-factor authentication disabled' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Complete login: verify the pending token (proves password was checked) + the
// TOTP code, then issue the real session.
exports.verifyLoginOtp = async (req, res) => {
    try {
        const { twoFactorToken, code } = req.body;
        if (!twoFactorToken || !code) {
            return res.status(400).json({ success: false, message: 'Authentication code is required' });
        }
        let decoded;
        try {
            decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET_KEY);
        } catch {
            return res.status(401).json({ success: false, message: 'Login session expired. Please sign in again.' });
        }
        if (!decoded.twoFactorPending) {
            return res.status(400).json({ success: false, message: 'Invalid login session' });
        }
        const user = await User.findById(decoded.id).select('+twoFactorAuth.secret');
        if (!user?.twoFactorAuth?.secret) {
            return res.status(400).json({ success: false, message: 'Invalid login session' });
        }
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorAuth.secret,
            encoding: 'base32',
            token: String(code),
            window: 1,
        });
        if (!verified) {
            return res.status(400).json({ success: false, message: 'Invalid authentication code' });
        }
        return issueSession(user, res, 200);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

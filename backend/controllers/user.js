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

const createTwoFactorPendingToken = (user, enrollmentRequired = false) =>
    jwt.sign(
        {
            id: user._id,
            twoFactorPending: true,
            enrollmentRequired,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '5m' }
    );

// register user
// Register User
exports.registerUser = async (req, res, next) => {
    try {
        const { name, whatsappNumber, email, password } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded.'
            });
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

        const avatarUrl =
            `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

        console.log('✅ Image uploaded successfully:', avatarUrl);

        // Create user as UNVERIFIED
        const user = await User.create({
            _id: generateId(),
            name,
            whatsappNumber,
            email,
            password,
            avatar: avatarUrl,
            isEmailVerified: false
        });

        // Generate email verification token
        const verificationToken = user.getEmailVerificationToken();

        // Save verification token and expiry
        await user.save({
            validateBeforeSave: false
        });

        // Create verification URL
        const verificationURL =
            `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

        console.log('📧 Verification URL generated');

        // Render verification email using EJS
        const emailMessage = await ejs.renderFile(
            path.join(__dirname, '../mails/verify-email.ejs'),
            {
                name: user.name,
                verificationURL
            }
        );

        // Send verification email
        sendEmailInBackground({
            email: user.email,
            subject: 'Verify Your Email - Ecommerce',
            html: emailMessage
        });

        console.log('📧 Verification email queued:', user.email);

        // DO NOT issue JWT or login cookie here.
        return res.status(201).json({
            success: true,
            message:
                'Registration successful. Please check your email and verify your account before logging in.',
            email: user.email
        });

    } catch (err) {
        console.error('⚠️ Registration Error:', err);

        return res.status(500).json({
            success: false,
            message: '⚠️ Error: ' + err.message
        });
    }
};

// Login User
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please Enter Email and Password'
            });
        }

        const user = await User.findOne({ email })
            .select('+password +twoFactorAuth.enabled');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Email or Password'
            });
        }

        // 1. Verify password FIRST
        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Email or Password'
            });
        }

        // 2. Email verification check
        if (!user.isEmailVerified) {
            return res.status(403).json({
                success: false,
                emailVerificationRequired: true,
                message: 'Please verify your email address before logging in.'
            });
        }

        // 3. Email verified.
        // SKIP 2FA ENTIRELY for demo accounts
        if (!user.isDemo) {
            // Check 2FA for non-demo users only
            const enrollmentRequired = user.role === 'admin' && !user.twoFactorAuth.enabled;
            
            if (user.twoFactorAuth.enabled || enrollmentRequired) {
                const twoFactorToken = createTwoFactorPendingToken(user, enrollmentRequired);

                return res.status(200).json({
                    success: true,
                    twoFactorRequired: true,
                    enrollmentRequired,
                    twoFactorToken
                });
            }
        }

        // 4. No 2FA required (or demo user) → create normal login session
        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                isDemo: user.isDemo,
                mfaVerified: false,
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '90d' }
        );

        const options = {
            expires: new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000
            ),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax'
        };

        return res.status(201)
            .cookie('token', token, options)
            .json({
                success: true,
                user
            });

    } catch (err) {
        console.error('⚠️ Login Error:', err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.demoQuickLogin = async (req, res) => {
    try {
        const user = await User.findOne({ email: 'demo@maisonorderplanning.in' });

    if(!user) {
        return res.status(404).json({
            success: false,
            message: 'Demo account not found. Please contact support.'
        });
    }

    if(!user.isDemo) {
        return res.status(400).json({
            success: false,
            message: 'The account is not a demo account. Please contact support.'
        });
    }

    const token = jwt.sign(
        {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isDemo: user.isDemo,
            mfaVerified: false,
        },
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: '90d'
        }
    );

    const options = {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    return res.status(200)
        .cookie('token', token, options)
        .json({
            success: true,
            user,
            message: "Demo account logged in successfully. You can now explore the application with limited functionality."
        });
    } catch (error) {
        console.error('⚠️ Demo Quick Login Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

exports.verifyEmail = async (req, res) => {
  try {
    const emailVerificationToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationToken,
    }).select("+emailVerificationToken +emailVerificationExpire");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email verification link is invalid or has expired.",
      });
    }

    // The link is authentic but no longer usable. Replace its token and send
    // a fresh link while the account remains unverified.
    if (!user.emailVerificationExpire || user.emailVerificationExpire <= Date.now()) {
      const verificationToken = user.getEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      const verificationURL =
        `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
      const emailMessage = await ejs.renderFile(
        path.join(__dirname, "../mails/verify-email.ejs"),
        { name: user.name, verificationURL }
      );

      sendEmailInBackground({
        email: user.email,
        subject: "Verify Your Email - Ecommerce",
        html: emailMessage,
      });

      return res.status(410).json({
        success: false,
        verificationEmailResent: true,
        message: "This verification link expired. We sent a new link to your email address.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify email address.",
    });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const user = await User.findOne({ email })
      .select("+emailVerificationToken +emailVerificationExpire");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email address is already verified.",
      });
    }

    const verificationToken = user.getEmailVerificationToken();

    await user.save({
      validateBeforeSave: false,
    });

    const verificationURL =
      `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    const emailMessage = await ejs.renderFile(
      path.join(__dirname, "../mails/verify-email.ejs"),
      {
        name: user.name,
        verificationURL,
      }
    );

    sendEmailInBackground({
      email: user.email,
      subject: "Verify Your Email - Ecommerce",
      html: emailMessage,
    });

    return res.status(200).json({
      success: true,
      message: "A new verification email has been sent.",
    });
  } catch (error) {
    console.error("Resend verification email error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send verification email.",
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

        let user = await User.findOne({ email }).select('+twoFactorAuth.enabled');

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

        const enrollmentRequired = user.role === 'admin' && !user.twoFactorAuth.enabled;
        if (user.twoFactorAuth.enabled || enrollmentRequired) {
            return res.status(200).json({
                success: true,
                twoFactorRequired: true,
                enrollmentRequired,
                twoFactorToken: createTwoFactorPendingToken(user, enrollmentRequired),
            });
        }

        let token = jwt.sign(
            { id: user._id, mfaVerified: false },
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
const issueSession = (user, res, statusCode = 200, mfaVerified = false) => {
    const isAdmin = user.role === 'admin';
    const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, avatar: user.avatar, mfaVerified },
        process.env.JWT_SECRET_KEY,
        { expiresIn: isAdmin ? '12h' : '90d' }
    );
    const options = {
        expires: new Date(Date.now() + (isAdmin ? 12 : 90 * 24) * 60 * 60 * 1000),
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

// Admins without 2FA are allowed to reach only this enrollment flow after
// proving their primary login factor. No authenticated session is issued yet.
exports.setupAdminTwoFactorEnrollment = async (req, res) => {
    try {
        const { twoFactorToken } = req.body;
        const decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET_KEY);
        if (!decoded.twoFactorPending || !decoded.enrollmentRequired) {
            return res.status(400).json({ success: false, message: 'Invalid admin enrollment session' });
        }

        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'admin' || user.twoFactorAuth.enabled) {
            return res.status(400).json({ success: false, message: 'Admin 2FA enrollment is not required' });
        }

        const secret = speakeasy.generateSecret({ name: `Maison Admin (${user.email})` });
        await User.findByIdAndUpdate(user._id, {
            'twoFactorAuth.tempSecret': secret.base32,
        });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);
        return res.status(200).json({ success: true, qrCode, secret: secret.base32 });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Admin enrollment session expired. Please sign in again.' });
    }
};

exports.verifyAdminTwoFactorEnrollment = async (req, res) => {
    try {
        const { twoFactorToken, code } = req.body;
        const decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET_KEY);
        if (!decoded.twoFactorPending || !decoded.enrollmentRequired) {
            return res.status(400).json({ success: false, message: 'Invalid admin enrollment session' });
        }

        const user = await User.findById(decoded.id).select('+twoFactorAuth.tempSecret');
        if (!user || user.role !== 'admin' || !user.twoFactorAuth.tempSecret) {
            return res.status(400).json({ success: false, message: 'Start admin 2FA enrollment first' });
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
        return issueSession(user, res, 200, true);
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Admin enrollment session expired. Please sign in again.' });
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
        if (user?.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Administrators must keep two-factor authentication enabled' });
        }
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
        return issueSession(user, res, 200, true);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

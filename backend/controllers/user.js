// const { s3 } = require('../app');
const User = require('../models/user');
const { sendEmailInBackground } = require('../utils/sendEmail');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
const generateId = require('../utils/generateId');
const { OAuth2Client } = require('google-auth-library');
const validator = require('validator'); 
const ejs = require('ejs');
const path = require('path');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// GOOGLE_OAUTH_CLIENT_ID is the name used in the old .env template.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const normalizeEmail = email => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const s3 = () => new S3Client({
    region: process.env.AWS_BUCKET_REGION,
    credentials: fromEnv()
});

// Unique per upload so two users' "avatar.jpg" never overwrite each other.
const uploadAvatar = async (userId, file) => {
    const safeName = file.originalname.replace(/[^\w.-]/g, '_');
    const key = `avatars/${userId}/${Date.now()}-${safeName}`;
    await s3().send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
    }));
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${key}`;
};

// Returns the S3 key for a URL in our bucket, or null for anything else
// (Google profile pictures, default avatars, ...).
const s3KeyFromUrl = imageUrl => {
    try {
        const parsed = new URL(imageUrl);
        const bucketHost = `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com`;
        if (parsed.host !== bucketHost) return null;
        return decodeURIComponent(parsed.pathname.slice(1)) || null;
    } catch {
        return null;
    }
};

const sendVerificationEmail = async user => {
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const emailMessage = await ejs.renderFile(
        path.join(__dirname, '../mails/verify-email.ejs'),
        { name: user.name, verificationURL }
    );
    sendEmailInBackground({
        email: user.email,
        subject: 'Verify Your Email - Ecommerce',
        html: emailMessage
    });
};

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
        const { name, whatsappNumber, password } = req.body;
        const email = normalizeEmail(req.body.email);
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded.'
            });
        }

        const userId = generateId();
        const avatarUrl = await uploadAvatar(userId, file);

        // Create user as UNVERIFIED
        const user = await User.create({
            _id: userId,
            name,
            whatsappNumber,
            email,
            password,
            avatar: avatarUrl,
            isEmailVerified: false
        });

        await sendVerificationEmail(user);

        // DO NOT issue JWT or login cookie here.
        return res.status(201).json({
            success: true,
            message:
                'Registration successful. Please check your email and verify your account before logging in.',
            email: user.email
        });

    } catch (err) {
        console.error('⚠️ Registration Error:', err);

        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email or phone number already exists'
            });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: err.message });
        }
        return res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
};

// Login User
exports.loginUser = async (req, res, next) => {
    try {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);

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

        return res.status(200)
            .cookie('token', token, options)
            .json({
                success: true,
                user
            });

    } catch (err) {
        console.error('⚠️ Login Error:', err);

        return res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
};

exports.demoQuickLogin = async (req, res) => {
    try {
        const user = await User.findOne({ 
            email: 'demo@maisonorderplanning.in',
            isDemo: true,
            role: 'admin'
        });

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
            expiresIn: '2h'
        }
    );

    const options = {
        expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // matches the 2h JWT
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
            message: 'Demo login failed. Please try again.'
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
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    const user = await User.findOne({ email })
      .select("+emailVerificationToken +emailVerificationExpire");

    // Same response whether or not the account exists, so this endpoint
    // can't be used to discover registered emails.
    if (user && !user.isEmailVerified) {
      await sendVerificationEmail(user);
    }

    return res.status(200).json({
      success: true,
      message: "If an unverified account exists for this email, a new verification link has been sent.",
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
        const email = normalizeEmail(req.body.email);
        const genericResponse = {
            success: true,
            message: 'If an account exists for this email, a password reset link has been sent.'
        };
        const user = email ? await User.findOne({ email }) : null;

        // Same response whether or not the account exists (no enumeration).
        if (!user) {
            return res.status(200).json(genericResponse);
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

        res.status(200).json(genericResponse);
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Could not start password recovery. Please try again.'
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

        // Saving a new password also sets passwordChangedAt, which revokes
        // every existing session.
        await user.save();

        // No session is issued here: the user signs in normally, which keeps
        // 2FA in the loop for accounts that have it enabled.
        res.status(200).json({
            success: true,
            message: 'Password has been reset. Please sign in with your new password.'
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
    res.status(200).json({
        success: true,
        user: req.user
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

        if (req.body.name) {
            user.name = req.body.name;
        }

        // A changed email must be verified again before it can be used to sign in.
        const newEmail = normalizeEmail(req.body.email);
        const emailChanged = Boolean(newEmail) && newEmail !== user.email;
        if (emailChanged) {
            user.email = newEmail;
            user.isEmailVerified = false;
        }

        if (req.file) {
            user.avatar = await uploadAvatar(user._id, req.file);
        }

        await user.save();

        if (emailChanged) {
            await sendVerificationEmail(user);
        }

        res.status(200).json({
            success: true,
            emailVerificationRequired: emailChanged,
            user
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'That email is already in use' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Could not update profile'
        });
    }
};

// update User password
exports.updatePassword = async (req, res, next) => {
    try {
        // password is select:false, so it has to be requested explicitly.
        const user = await User.findById(req.user._id).select('+password');

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

        // Revokes all other sessions (passwordChangedAt), then re-issues this one
        // with a normal expiry, keeping the admin's MFA state.
        await user.save();

        return issueSession(user, res, 200, Boolean(req.auth?.mfaVerified));
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: err.message });
        }
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// get all users --admin
exports.getAllUsers = async (req, res, next) => {
    // The demo admin must never see real customers.
    const filter = req.user?.isDemo ? { isDemo: true } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        users
    });
};

// get single user --admin
exports.getSingleUser = async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user || (req.user?.isDemo && !user.isDemo)) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
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
        const ROLES = ['user', 'admin'];
        const { name, email, role } = req.body;

        if (role !== undefined && !ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        if (String(req.params.id) === String(req.user._id) && role && role !== req.user.role) {
            return res.status(400).json({ success: false, message: 'You cannot change your own role' });
        }

        const newUserData = {};
        if (name) newUserData.name = name;
        if (email) newUserData.email = normalizeEmail(email);
        if (role) newUserData.role = role;

        const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'That email is already in use' });
        }
        res.status(500).json({
            success: false,
            message: 'Could not update user'
        });
    }
};

// delete user --admin
// DELETE /api/v1/admin/user/:id
exports.deleteUser = async (req, res) => {
    try {
        if (String(req.params.id) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account here' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.deleteOne({ _id: user._id });

        // Best effort: only delete avatars that actually live in our bucket.
        const key = s3KeyFromUrl(user.avatar);
        if (key) {
            s3().send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }))
                .catch(err => console.error('Avatar delete failed:', err.message));
        }

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Could not delete user' });
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

        if (!GOOGLE_CLIENT_ID) {
            // Without an audience, tokens minted for ANY Google app would pass.
            console.error('🔐 GOOGLE_CLIENT_ID is not configured');
            return res.status(503).json({ success: false, message: 'Google sign-in is not configured' });
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload.email_verified) {
            return res.status(401).json({
                success: false,
                message: 'Your Google email address is not verified'
            });
        }
        const { name, picture } = payload;
        const email = normalizeEmail(payload.email);

        let user = await User.findOne({ email }).select('+twoFactorAuth.enabled');

        if (!user) {
            user = await User.create({
                _id: generateId(),
                name,
                email,
                avatar: picture,
                authProvider: 'google',
                isEmailVerified: true
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
            user
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

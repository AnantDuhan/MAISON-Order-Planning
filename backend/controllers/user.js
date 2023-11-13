// const { s3 } = require('../app');
const User = require('../models/user');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'backend/config/config.env' });
const nodeCache = require('node-cache');
const NodeCache = new nodeCache();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');

const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION,
    credentials: fromEnv()
});

// const s3 = new S3Client({
//     region: process.env.AWS_BUCKET_REGION,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// register user
exports.registerUser = async(req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const file = req.file;

        if (!file) {
            res.status(400).send('No file uploaded.');
            return;
        }

        // Define the upload parameters
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: file.originalname, // The name under which the file will be stored in S3
            Body: file.buffer // The file data to be uploaded
        };

        // Upload the file to S3
        const avatarUrl = await s3
            .upload(uploadParams, (err, data) => {
                if (err) {
                    console.error('⚠️ Error uploading image:', err);
                    res.status(500).json({
                        success: false,
                        message: '⚠️ Error uploading image.' + err.message
                    });
                    return;
                }
                console.log('✅ Image uploaded successfully:', data.Location);
                res.status(200).json({
                    success: true,
                    message: '✅ Image uploaded successfully.' + data.Location
                });
            })
            .promise();

        const user = await User.create({
            name,
            email,
            password,
            avatar: avatarUrl.Location
        });

        let token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email
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
}

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

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid Email or Password'
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

        console.log("message", message);

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

        // Check if user data is in the cache
        let user = NodeCache.get(resetPasswordToken);

        // If not in the cache, fetch from the database
        if (!user) {
            user = await User.findOne({
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });

            // Cache the user data for future use
            if (user) {
                NodeCache.set(resetPasswordToken, user);
            }
        }

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

        // Clear the cache for the user
        NodeCache.del(resetPasswordToken);

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

    let user;

    if (NodeCache.has('user')) {
        user = JSON.parse(JSON.stringify(NodeCache.get('user')));
    } else {
        console.log('id', req.user._id)
        user = await getUserFromCache(`${req.user._id}`);
        NodeCache.set('user', JSON.stringify(user));
    }

    res.status(200).json({
        success: true,
        user
    });
};

// update User password
exports.updatePassword = async (req, res, next) => {
    try {

        const user = await getUserFromCache(`${req.user._id}`);

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

        // Clear the cache for the updated user
        NodeCache.del(req.user.id);

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

async function getUserFromCache(userId) {
    // Check if user data is in the cache
    let user = NodeCache.get(userId);

    // If not in the cache, fetch from the database
    if (!user) {
        user = await User.findById(userId).select('+password');

        // Cache the user data for future use
        if (user) {
            NodeCache.set(userId, user);
        }
    }

    return user;
}

// get all users --admin
exports.getAllUsers = async (req, res, next) => {
    let users;

    if (NodeCache.has('users')) {
        users = JSON.parse(JSON.stringify(NodeCache.get('users')));
    } else {
        users = await User.find();
        NodeCache.set('users', JSON.stringify(users));
    }

    res.status(200).json({
        success: true,
        users
    });
};

// get single user --admin
exports.getSingleUser = async (req, res, next) => {

    let user;

    if (NodeCache.has('user')) {
        user = JSON.parse(JSON.stringify(NodeCache.get('user')));
    } else {
        user = await User.findById(req.params.id);
        NodeCache.set('user', JSON.stringify(user));
    }

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
        let user;
        const newUserData = {
            name: req.body.name,
            email: req.body.email,
            role: req.body.role
        };

        // Check if user data is in the cache
        if (NodeCache.has(req.params.id)) {
            user = JSON.parse(JSON.stringify(NodeCache.get(req.params.id)));
        } else {
            // If not in the cache, fetch from the database
            user = await User.findByIdAndUpdate(req.params.id, newUserData, {
                new: true,
                runValidators: true,
                useFindAndModify: false
            });

            // Cache the updated user data for future use
            if (user) {
                NodeCache.set(req.params.id, user);
            }
        }

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


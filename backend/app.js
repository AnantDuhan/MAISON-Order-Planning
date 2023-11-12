const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const errorMiddleware = require('./middleware/error');
const multer = require('multer');
const AWS = require('aws-sdk');
const { isAuthUser, authRoles } = require('./middleware/auth');
const User = require('./models/user');
const Product = require('./models/product');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(
    'sk_test_51K9RkSSDvITsgzEymgWGmrPCCP0Iu8b8j2AtRaZbnuXqwSLkQMSnTc6a6gQmRRzT60nP0KMhApPEpASMOPP3GgGh00rlK3KQm2'
);
require('dotenv').config({ path: '/backend/config/config.env' });

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(
    bodyParser.urlencoded({
        extended: true,
        limit: '50mb',
        parameterLimit: 50000
    })
);

AWS.config.update({
    region: process.env.AWS_BUCKET_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

// Configure Multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'image/png' ||
            file.mimetype === 'image/jpg' ||
            file.mimetype === 'image/jpeg'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'));
        }
    }
});

// app.use(upload.single('image'));
// app.use(upload.array('product', 10));

// Route Imports
const productRoute = require('./routes/product');
const userRoute = require('./routes/user');
const orderRoute = require('./routes/order');
const paymentRoute = require('./routes/payment');
const couponRoute = require('./routes/coupon');
const subscriptionRoute = require('./routes/plusMembership');

app.use('/api/v1', productRoute);
app.use('/api/v1', userRoute);
app.use('/api/v1', orderRoute);
app.use('/api/v1', paymentRoute);
app.use('/api/v1', couponRoute);
app.use('/api/v1', subscriptionRoute);

// CORS
app.use(async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', '*');
    return next();
});

// middleware for error
app.use(errorMiddleware);

app.post('/register', upload.single('image'), async (req, res) => {
    try {
        const { name, whatsappNumber, email, password } = req.body;
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

        const customer = await stripe.customers.create({
            email,
            source: 'tok_visa'
        });

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
            whatsappNumber,
            email,
            password,
            avatar: avatarUrl.Location,
            stripeCustomerId: customer.id
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
});

app.put('/me/update', isAuthUser, upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;
        const file = req.file;

        // Upload the avatar image to AWS S3
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${userId}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.error('⚠️ Error uploading avatar:', err);
                res.status(500).json({ error: '⚠️ Internal server error.' });
            } else {
                const avatarUrl = data.Location;

                // Update the user profile in the database
                User.findByIdAndUpdate(
                    userId,
                    { name: name, email: email, avatar: avatarUrl },
                    { new: true },
                    (err, updatedUser) => {
                        if (err) {
                            console.error('⚠️ Error updating profile:', err);
                            res.status(500).json({
                                error: '⚠️ Internal server error.'
                            });
                        } else {
                            res.status(200).json({
                                message: '✅ Profile updated successfully.',
                                user: updatedUser
                            });
                        }
                    }
                );
            }
        });
    } catch (error) {
        console.error('⚠️ Error processing request:', error);
        res.status(500).json({ error: '⚠️ Internal server error.' });
    }
});

// Extract image key from URL
const getImageKeyFromUrl = imageUrl => {
    const parsedUrl = url.parse(imageUrl);
    const pathName = parsedUrl.pathname;
    const key = pathName.substring(1); // Remove the leading slash (/)

    return key;
};

app.delete(
    '/admin/user/:id',
    isAuthUser,
    authRoles('admin'),
    async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: '⚠️ User not found' });
            }

            // Delete image from AWS S3
            const imageKey = getImageKeyFromUrl(user.avatar);
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: imageKey
            };
            await s3.deleteObject(deleteParams).promise();
            console.log('✅ Image deleted from AWS S3');

            // Delete user from MongoDB
            await User.findByIdAndDelete(userId);
            console.log('✅ User deleted from MongoDB:', user);

            return res.status(200).json({
                success: true,
                message: '✅ Profile deleted successfully.'
            });
        } catch (error) {
            console.error('⚠️ Error processing request:', error);
            return res.status(500).json({ error: '⚠️ Internal server error.' });
        }
    }
);

app.post(
    '/admin/add-product',
    isAuthUser,
    authRoles('admin'),
    upload.array('product', 10),
    async (req, res) => {
        try {
            const { name, description, price, category, Stock } = req.body;
            const files = req.files;

            const imageUrls = [];

            if (files && files.length > 0) {
                for (const file of files) {
                    // Upload the product image to AWS S3
                    const uploadParams = {
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: file.originalname,
                        Body: file.buffer,
                        ContentType: file.mimetype
                    };

                    const uploadResult = await s3
                        .upload(uploadParams, (err, data) => {
                            if (err) {
                                console.error('⚠️ Error uploading image:', err);
                                res.status(500).json({
                                    success: false,
                                    message:
                                        '⚠️ Error uploading image.' +
                                        err.message
                                });
                                return;
                            }
                            console.log(
                                '✅ Image uploaded successfully:',
                                data.Location
                            );
                            res.status(200).json({
                                success: true,
                                message:
                                    '✅ Image uploaded successfully.' +
                                    data.Location
                            });
                        })
                        .promise();

                    imageUrls.push(uploadResult.Location);
                }
            }

            // Create a new product in the database
            const product = await Product.create({
                name,
                description,
                price,
                category,
                Stock,
                images: imageUrls.map(url => ({ url })),
                user: req.user.id
            });

            const newProduct = await product.save();

            res.status(201).json({
                message: '✅ Product created successfully.',
                product: newProduct
            });
        } catch (error) {
            console.error('⚠️ Error creating product:', error);
            res.status(500).json({
                success: false,
                error: '⚠️ Internal server error.' + error
            });
        }
    }
);

app.put(
    '/admin/product/:id',
    isAuthUser,
    authRoles('admin'),
    upload.array('product', 10),
    async (req, res) => {
        try {
            const productId = req.params.id;
            const { name, description, price, category, stock } = req.body;
            const files = req.files;

            let imageUrls = [];

            const product = await Product.findById(productId);

            if (!product) {
                return res.status(404).json({ error: '⚠️ Product not found' });
            }

            // Delete images from AWS S3
            const deleteObjects = product.images.map(image => ({
                Key: getImageKeyFromUrl(image.url)
            }));
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Delete: {
                    Objects: deleteObjects,
                    Quiet: false
                }
            };
            await s3.deleteObjects(deleteParams).promise();
            console.log('✅ Images deleted from AWS S3');

            // Upload new images
            for (const file of files) {
                const params = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: file.originalname,
                    Body: file.buffer,
                    ContentType: file.mimetype
                };

                const s3UploadResult = await s3.upload(params).promise();
                imageUrls.push({
                    key: file.originalname,
                    url: s3UploadResult.Location
                });
            }

            // Update the product in the database
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    name,
                    description,
                    price,
                    category,
                    stock,
                    images: imageUrls
                },
                { new: true }
            );

            if (!updatedProduct) {
                return res
                    .status(404)
                    .json({ error: '⚠️⚠️ Product not found.' });
            }

            res.status(200).json({
                message: '✅ Product updated successfully.',
                product: updatedProduct
            });
        } catch (error) {
            console.error('⚠️ Error processing request:', error);
            res.status(500).json({
                success: false,
                error: '⚠️ Internal server error.'
            });
        }
    }
);

app.put(
    '/admin/product/:id',
    isAuthUser,
    authRoles('admin'),
    upload.array('product', 10),
    async (req, res) => {
        try {
            const productId = req.params.id;
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: '⚠️ Product not found' });
            }

            // Delete images from AWS S3
            const deleteObjects = product.images.map(image => ({
                Key: getImageKeyFromUrl(image.url)
            }));
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Delete: {
                    Objects: deleteObjects,
                    Quiet: false
                }
            };
            await s3.deleteObjects(deleteParams).promise();
            console.log('✅ Images deleted from AWS S3');

            // Delete product from MongoDB
            await Product.findByIdAndDelete(productId);
            console.log('✅ Product deleted from MongoDB:', product);

            return res.status(200).json({
                success: true,
                message: '✅ Product deleted successfully.',
                product
            });
        } catch (error) {
            console.error('⚠️ Error processing request:', error);
            return res.status(500).json({ error: '⚠️ Internal server error.' });
        }
    }
);

app.delete(
    '/admin/product/:id',
    isAuthUser,
    authRoles('admin'),
    async (req, res) => {
        try {
            const productId = req.params.id;
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: '⚠️ Product not found' });
            }

            // Delete images from AWS S3
            const deleteObjects = product.images.map(image => ({
                Key: getImageKeyFromUrl(image.url)
            }));
            const deleteParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Delete: {
                    Objects: deleteObjects,
                    Quiet: false
                }
            };
            await s3.deleteObjects(deleteParams).promise();
            console.log('✅ Images deleted from AWS S3');

            // Delete product from MongoDB
            await Product.findByIdAndDelete(productId);
            console.log('✅ Product deleted from MongoDB:', product);

            return res.status(200).json({
                success: true,
                message: '✅ Product deleted successfully.',
                product
            });
        } catch (error) {
            console.error('⚠️ Error processing request:', error);
            return res.status(500).json({ error: '⚠️ Internal server error.' });
        }
    }
);

module.exports = app;
// module.exports = s3;
// module.exports = upload;

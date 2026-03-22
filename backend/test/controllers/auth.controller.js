const User = require('../../models/user');
const stripe = require('stripe')(
    'sk_test_51K9RkSSDvITsgzEymgWGmrPCCP0Iu8b8j2AtRaZbnuXqwSLkQMSnTc6a6gQmRRzT60nP0KMhApPEpASMOPP3GgGh00rlK3KQm2'
);
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_BUCKET_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

// Configure Multer for file uploads
// const upload = multer({
//     storage: multer.memoryStorage(),
//     fileFilter: (req, file, cb) => {
//         if (
//             file.mimetype === 'image/png' ||
//             file.mimetype === 'image/jpg' ||
//             file.mimetype === 'image/jpeg'
//         ) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type.'));
//         }
//     }
// });

async function registerUser(req) {
    const { name, whatsappNumber, email, password } = req.body;
    const file = req.file;

    if (!file) {
        return 'No file uploaded';
    }

    // Define the upload parameters
    const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: file.originalname,
        Body: file.buffer
    };

    const customer = await stripe.customers.create({
        email,
        source: 'tok_visa'
    });

    const avatarUrl = await s3.upload(uploadParams).promise();

    const user = await User.create({
        name,
        whatsappNumber,
        email,
        password,
        avatar: avatarUrl.Location,
        stripeCustomerId: customer.id
    });

    return user;
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        // checking if user has given email and password both
        if (!email || !password) {
            return 'Please Enter Email and Password';
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return 'Invalid Email or Password';
        }

        const isPasswordMatched = await user.comparePassword(password);
        if (!isPasswordMatched) {
            return 'Invalid Email or Password';
        }

        console.log(user);

        return user;
    } catch (err) {
        return 'Failed to Login';
    }
};

module.exports = {
    registerUser,
    loginUser
};

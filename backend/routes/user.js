const express = require('express');
const {
   registerUser,
   loginUser,
   logout,
   forgotPassword,
   resetPassword,
   getUserDetails,
    updateProfile,
   updatePassword,
   getAllUsers,
   getSingleUser,
   updateUserRole,
   googleLogin,
   sendLoginOtp,
   verifyLoginOtp,
   setupTwoFactorAuth,
   verifyTwoFactorAuth,
   disableTwoFactorAuth,
   validateTfaToken,
   getAddresses,
   addAddress,
   deleteAddress,
} = require('../controllers/user');

const { isAuthUser, authRoles } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
// const upload = require('../app');
const multer = require('multer');
const { contactUs } = require('../controllers/contact');
const { subscriber } = require('../controllers/subscribe');

// Configure Multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'image/png' ||
            file.mimetype === 'image/jpg' ||
            file.mimetype === 'image/jpeg' ||
            file.mimetype === 'image/webp'
        ) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'));
        }
    }
});

const router = express.Router();

router.route('/register').post(authLimiter, upload.single('image'), registerUser);

router.route('/login').post(authLimiter, loginUser);

router.route('/password/forgot').post(authLimiter, forgotPassword);

router.route('/password/reset/:token').put(authLimiter, resetPassword);

router.route('/logout').get(logout);

router.route('/me').get(isAuthUser, getUserDetails);

// Address book
router.route('/addresses').get(isAuthUser, getAddresses);
router.route('/address/new').post(isAuthUser, addAddress);
router.route('/address/:addressId').delete(isAuthUser, deleteAddress);

router.route('/me/update').put(isAuthUser, upload.single('image'), updateProfile);

router.route('/password/update').put(isAuthUser, updatePassword);

router.route('/admin/users').get(isAuthUser, authRoles('admin'), getAllUsers);

router
    .route('/admin/user/:id')
    .get(isAuthUser, authRoles('admin'), getSingleUser)
    .put(isAuthUser, authRoles('admin'), updateUserRole);

router.route('/contact-us').post(contactUs);

router.route('/subscribe').post(subscriber);

router.route('/auth/google').post(authLimiter, googleLogin);

module.exports = router;

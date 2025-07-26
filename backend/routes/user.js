const express = require('express');
const {
   registerUser,
   loginUser,
   logout,
   forgotPassword,
   resetPassword,
   getUserDetails,
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
} = require('../controllers/user');

const { isAuthUser, authRoles } = require('../middleware/auth');
// const upload = require('../app');
const multer = require('multer');
// const { contactUs } = require('../controllers/contact');
const { subscriber } = require('../controllers/subscribe');

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

const router = express.Router();

router.route('/register').post(upload.single('image'), registerUser);

router.route('/login').post(loginUser);

router.route('/password/forgot').post(forgotPassword);

router.route('/password/reset/:token').put(resetPassword);

router.route('/logout').get(logout);

router.route('/me').get(isAuthUser, getUserDetails);

router.route('/password/update').put(isAuthUser, updatePassword);

router.route('/admin/users').get(isAuthUser, authRoles('admin'), getAllUsers);

router
    .route('/admin/user/:id')
    .get(isAuthUser, authRoles('admin'), getSingleUser)
    .put(isAuthUser, authRoles('admin'), updateUserRole);

// router.route('/contact-us').post(contactUs);

router.route('/subscribe').post(subscriber);

router.route('/auth/google').post(googleLogin);

router.route('/otp/send').post(sendLoginOtp);
router.route('/otp/verify').post(verifyLoginOtp);

// 2FA Routes
router.route('/2fa/setup').get(isAuthUser, setupTwoFactorAuth);
router.route('/2fa/verify').post(isAuthUser, verifyTwoFactorAuth);
router.route('/2fa/disable').post(isAuthUser, disableTwoFactorAuth);
router.route('/2fa/validate').post(validateTfaToken);

module.exports = router;

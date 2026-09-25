const express = require('express');
const {
   registerUser,
   loginUser,
   logout,
   forgotPassword,
   resetPassword,
   getUserDetails,
    updateProfile,
    registerPushToken,
   updatePassword,
   getAllUsers,
   getSingleUser,
   updateUserRole,
   deleteUser,
   googleLogin,
   verifyLoginOtp,
   setupAdminTwoFactorEnrollment,
   verifyAdminTwoFactorEnrollment,
   setupTwoFactorAuth,
   verifyTwoFactorAuth,
   disableTwoFactorAuth,
   getAddresses,
   addAddress,
   deleteAddress,
   verifyEmail,
   resendVerificationEmail,
   demoQuickLogin,
} = require('../controllers/user');

const { isAuthUser, authRoles } = require('../middleware/auth');
const { authLimiter, emailLimiter, accountLimiter } = require('../middleware/rateLimiter');
const demoGuard = require('../middleware/demoGuard');
const multer = require('multer');
const { contactUs } = require('../controllers/contact');
const { subscriber, unsubscribe } = require('../controllers/subscribe');

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
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

router.route('/register').post(authLimiter, upload.single('image'), registerUser);

router.route('/login').post(authLimiter, loginUser);

router.route("/verify-email/:token").get(authLimiter, verifyEmail);

router
  .route("/resend-verification")
  .post(emailLimiter, resendVerificationEmail);

// Two-factor authentication
router.route('/login/2fa').post(authLimiter, verifyLoginOtp);      // complete login with a TOTP code
router.route('/login/2fa/setup').post(authLimiter, setupAdminTwoFactorEnrollment);
router.route('/login/2fa/enroll').post(authLimiter, verifyAdminTwoFactorEnrollment);
router.route('/2fa/setup').get(isAuthUser, demoGuard('manage-2fa'), setupTwoFactorAuth);    // begin setup → returns QR
router.route('/2fa/verify').post(isAuthUser, demoGuard('manage-2fa'), accountLimiter, verifyTwoFactorAuth); // confirm setup → enables 2FA
router.route('/2fa/disable').post(isAuthUser, demoGuard('manage-2fa'), accountLimiter, disableTwoFactorAuth);

router.route('/password/forgot').post(authLimiter, forgotPassword);

router.route('/password/reset/:token').put(authLimiter, resetPassword);

router.route('/logout').get(logout);

router.route('/me').get(isAuthUser, getUserDetails);

// Address book
router.route('/addresses').get(isAuthUser, getAddresses);
router.route('/address/new').post(isAuthUser, addAddress);
router.route('/address/:addressId').delete(isAuthUser, deleteAddress);

router.route('/me/update').put(isAuthUser, demoGuard('update-profile'), upload.single('image'), updateProfile);
router.route('/me/push-token').put(isAuthUser, registerPushToken);

router.route('/password/update').put(isAuthUser, demoGuard('change-password'), accountLimiter, updatePassword);

router.route('/admin/users').get(isAuthUser, authRoles('admin'), getAllUsers);

router
    .route('/admin/user/:id')
    .get(isAuthUser, authRoles('admin'), getSingleUser)
    .put(isAuthUser, authRoles('admin'), updateUserRole)
    .delete(isAuthUser, authRoles('admin'), deleteUser);

router.route('/contact-us').post(emailLimiter, contactUs);

router.route('/subscribe').post(emailLimiter, subscriber);
router.route('/unsubscribe/:token').get(unsubscribe);

router.route('/auth/google').post(authLimiter, googleLogin);

router.route('/demo/quick-login').get(accountLimiter, demoQuickLogin);

module.exports = router;

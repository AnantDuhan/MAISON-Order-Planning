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

module.exports = router;

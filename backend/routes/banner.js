const express = require('express');
const router = express.Router();

const {
    getActiveBanners,
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner
} = require('../controllers/banner');
const { isAuthUser, authRoles } = require('../middleware/auth');

router.route('/banners').get(getActiveBanners);

router.route('/admin/banners').get(isAuthUser, authRoles('admin'), getAllBanners);
router.route('/admin/banner').post(isAuthUser, authRoles('admin'), createBanner);
router
    .route('/admin/banner/:id')
    .put(isAuthUser, authRoles('admin'), updateBanner)
    .delete(isAuthUser, authRoles('admin'), deleteBanner);

module.exports = router;

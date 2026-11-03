const express = require('express');
const {
   getAllProducts,
   getAdminProducts,
   getProductDetails,
   createProductReview,
   getMyReview,
   unsubscribeReviewRequests,
   getProductReviews,
   deleteReview,
   addToWishList,
   removeFromWishList,
   getAllWishlistProducts,
   summerizeProductReviews,
   updateProduct,
   getBackInStockStatus,
   requestBackInStock,
   cancelBackInStock,
   getInventoryReport,
   getOptionTemplate,
   getRelatedProducts,
//    searchProducts,
//    getAutocompleteSuggestions
} = require('../controllers/product');

const { isAuthUser, authRoles, optionalAuth } = require('../middleware/auth');
const { emailLimiter } = require('../middleware/rateLimiter');
const demoGuard = require('../middleware/demoGuard');

const { requireFeature } = require('../services/featureFlags');
const router = express.Router();

// Requests from guests send an email to an address they typed, so they share
// the per-IP email budget. Signed-in shoppers can toggle freely.
const guestEmailLimit = (req, res, next) => (req.user ? next() : emailLimiter(req, res, next));

// router.get('/products/autocomplete', getAutocompleteSuggestions);

router.route('/products').get(getAllProducts);

router.route('/wishlist').get(isAuthUser, getAllWishlistProducts);

router
    .route('/wishlist/:id')
    .post(isAuthUser, addToWishList)
    .delete(isAuthUser, removeFromWishList);

router.route('/admin/update/product/:id').put(isAuthUser, authRoles('admin'), updateProduct);

router
    .route('/admin/products')
    .get(isAuthUser, authRoles('admin'), getAdminProducts);

router.route('/product/:id').get(getProductDetails);
router.route('/product/:id/related').get(getRelatedProducts);

router
    .route('/product/:id/notify-me')
    .get(optionalAuth, getBackInStockStatus)
    // Guests can ask too, with an email; they get the email-sending budget.
    .post(optionalAuth, guestEmailLimit, requireFeature('backInStock'), requestBackInStock)
    .delete(isAuthUser, cancelBackInStock);

router.route('/admin/inventory').get(isAuthUser, authRoles('admin'), getInventoryReport);
router.route('/admin/product-options/template').get(isAuthUser, authRoles('admin'), getOptionTemplate);

router.route('/review').post(isAuthUser, requireFeature('reviews'), demoGuard('submit-review'), createProductReview);
router.route('/product/:id/my-review').get(isAuthUser, getMyReview);
router.route('/review-requests/unsubscribe/:token').get(unsubscribeReviewRequests);

router
    .route('/reviews')
    .get(getProductReviews);

router.route('/review/:reviewId').delete(isAuthUser, demoGuard('submit-review'), deleteReview);

router.route('/products/:id/summarize-reviews').post(isAuthUser, authRoles('admin'), summerizeProductReviews);

// router.route("/search").get(searchProducts);

// router.route('/admin/product/:productId').put(isAuthUser, authRoles('admin'), upload.array('product', 5), updateProduct);

module.exports = router;
 
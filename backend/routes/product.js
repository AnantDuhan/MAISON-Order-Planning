const express = require('express');
const {
   getAllProducts,
   getAdminProducts,
   getProductDetails,
   createProductReview,
   getProductReviews,
   deleteReview,
   addToWishList,
   removeFromWishList,
   getAllWishlistProducts,
   summerizeProductReviews,
   updateProduct,
   getSimilarProducts,
   getRecommendedProducts,
//    searchProducts,
//    getAutocompleteSuggestions
} = require('../controllers/product');

const { isAuthUser, authRoles } = require('../middleware/auth');

const router = express.Router();

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
router.route('/products/:id/similar').get(getSimilarProducts);
router.route('/recommendations').get(getRecommendedProducts);

router.route('/review').post(isAuthUser, createProductReview);

router
    .route('/reviews')
    .get(getProductReviews);

router.route('/review/:reviewId').delete(isAuthUser, deleteReview);

router.route('/products/:id/summarize-reviews').post(isAuthUser, authRoles('admin'), summerizeProductReviews);

router.route('/recommended').get(isAuthUser, getRecommendedProducts);

// router.route("/search").get(searchProducts);

// router.route('/admin/product/:productId').put(isAuthUser, authRoles('admin'), upload.array('product', 5), updateProduct);

module.exports = router;
 
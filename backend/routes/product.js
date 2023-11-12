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
   getAllWishlistProducts
} = require('../controllers/product');

const { isAuthUser, authRoles } = require('../middleware/auth');

const router = express.Router();

router.route('/products').get(getAllProducts);

router.route('/wishlist').get(isAuthUser, getAllWishlistProducts);

router
    .route('/wishlist/:id')
    .post(isAuthUser, addToWishList)
    .delete(isAuthUser, removeFromWishList);

router
    .route('/admin/products')
    .get(isAuthUser, authRoles('admin'), getAdminProducts);

router.route('/product/:id').get(getProductDetails);

router.route('/review').post(isAuthUser, createProductReview);

router
    .route('/reviews')
    .get(getProductReviews);

router.route('/review/:reviewId').delete(isAuthUser, deleteReview);

module.exports = router;

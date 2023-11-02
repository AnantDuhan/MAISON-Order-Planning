import axios from 'axios';

import { ADD_PRODUCT_TO_WISHLIST_FAIL, ADD_PRODUCT_TO_WISHLIST_REQUEST, ADD_PRODUCT_TO_WISHLIST_SUCCESS, ADMIN_PRODUCT_FAIL, ADMIN_PRODUCT_REQUEST, ADMIN_PRODUCT_SUCCESS, ALL_PRODUCT_FAIL, ALL_PRODUCT_REQUEST, ALL_PRODUCT_SUCCESS, ALL_REVIEW_FAIL, ALL_REVIEW_REQUEST, ALL_REVIEW_SUCCESS, ALL_WISHLIST_PRODUCTS_FAIL, ALL_WISHLIST_PRODUCTS_REQUEST, ALL_WISHLIST_PRODUCTS_SUCCESS, CLEAR_ERRORS, DELETE_PRODUCT_FAIL, DELETE_PRODUCT_REQUEST, DELETE_PRODUCT_SUCCESS, DELETE_REVIEW_FAIL, DELETE_REVIEW_REQUEST, DELETE_REVIEW_SUCCESS, NEW_PRODUCT_FAIL, NEW_PRODUCT_REQUEST, NEW_PRODUCT_SUCCESS, NEW_REVIEW_FAIL, NEW_REVIEW_REQUEST, NEW_REVIEW_SUCCESS, PRODUCT_DETAILS_FAIL, PRODUCT_DETAILS_REQUEST, PRODUCT_DETAILS_SUCCESS, REMOVE_PRODUCT_FROM_WISHLIST_FAIL, REMOVE_PRODUCT_FROM_WISHLIST_REQUEST, REMOVE_PRODUCT_FROM_WISHLIST_SUCCESS, UPDATE_PRODUCT_FAIL, UPDATE_PRODUCT_REQUEST, UPDATE_PRODUCT_SUCCESS } from '../constants/productConstants';

// Get All Products
export const getProduct = (
    keyword = '',
    currentPage = 1,
    price = [0, 400000],
    category,
    ratings = 0
) => async dispatch => {
    try {
        dispatch({ type: ALL_PRODUCT_REQUEST });

        let link = `/api/v1/products?keyword=${keyword}&page=${currentPage}&price[gte]=${price[0]}&price[lte]=${price[1]}&ratings[gte]=${ratings}`;

        if (category) {
            link = `/api/v1/products?keyword=${keyword}&page=${currentPage}&price[gte]=${price[0]}&price[lte]=${price[1]}&category=${category}&ratings[gte]=${ratings}`;
        }

        const { data } = await axios.get(link);

        dispatch({
            type: ALL_PRODUCT_SUCCESS,
            payload: data
        });
    } catch (error) {
        dispatch({
            type: ALL_PRODUCT_FAIL,
            payload: error.response.data.message
        });
    }
};

// Get All Products For Admin
export const getAdminProduct = () => async dispatch => {
    try {
        dispatch({ type: ADMIN_PRODUCT_REQUEST });

        const { data } = await axios.get('/api/v1/admin/products');

        dispatch({
            type: ADMIN_PRODUCT_SUCCESS,
            payload: data.products
            // payload: data,
        });
    } catch (error) {
        dispatch({
            type: ADMIN_PRODUCT_FAIL,
            payload: error.response.data.message
        });
    }
};

// Create Product
export const createProduct = productData => async dispatch => {
    try {
        dispatch({ type: NEW_PRODUCT_REQUEST });

        const config = {
            headers: { 'Content-Type': 'application/json' }
        };

        const { data } = await axios.post(`/admin/add-product`, productData, {
            config
        });

        dispatch({
            type: NEW_PRODUCT_SUCCESS,
            payload: data
        });
    } catch (error) {
        dispatch({
            type: NEW_PRODUCT_FAIL,
            payload: error.response.data.message
        });
    }
};

// Update Product
export const updateProduct = (id, productData) => async dispatch => {
    try {
        dispatch({ type: UPDATE_PRODUCT_REQUEST });

        const config = {
            headers: { 'Content-Type': 'application/json' }
        };

        const { data } = await axios.put(`/admin/product/${id}`, productData, {
            config
        });

        dispatch({
            type: UPDATE_PRODUCT_SUCCESS,
            payload: data.success
        });
    } catch (error) {
        dispatch({
            type: UPDATE_PRODUCT_FAIL,
            payload: error.response.data.message
        });
    }
};

// Delete Product
export const deleteProduct = id => async dispatch => {
    try {
        dispatch({ type: DELETE_PRODUCT_REQUEST });

        const { data } = await axios.delete(`/admin/product/${id}`);

        dispatch({
            type: DELETE_PRODUCT_SUCCESS,
            payload: data.success
        });
    } catch (error) {
        dispatch({
            type: DELETE_PRODUCT_FAIL,
            payload: error.response.data.message
        });
    }
};

// Get Products Details
export const getProductDetails = id => async dispatch => {
    try {
        dispatch({ type: PRODUCT_DETAILS_REQUEST });

        const { data } = await axios.get(`/api/v1/product/${id}`);

        dispatch({
            type: PRODUCT_DETAILS_SUCCESS,
            payload: data.product
        });
    } catch (error) {
        dispatch({
            type: PRODUCT_DETAILS_FAIL,
            payload: error.response.data.message
        });
    }
};

// NEW REVIEW
export const newReview = reviewData => async dispatch => {
    try {
        dispatch({ type: NEW_REVIEW_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const { data } = await axios.post(
            `/api/v1/review`,
            { reviewData },
            { config }
        );

        console.log('DATA', data);

        dispatch({
            type: NEW_REVIEW_SUCCESS,
            payload: data.review
        });
    } catch (error) {
        dispatch({
            type: NEW_REVIEW_FAIL,
            payload: error.response.data.message
        });
    }
};

// Get All Reviews of a Product
export const getAllReviews = id => async dispatch => {
    try {
        dispatch({ type: ALL_REVIEW_REQUEST });

        const { data } = await axios.get(`/api/v1/reviews?id=${id}`);

        dispatch({
            type: ALL_REVIEW_SUCCESS,
            payload: data.reviews
        });
    } catch (error) {
        dispatch({
            type: ALL_REVIEW_FAIL,
            payload: error.response.data.message
        });
    }
};

// Delete Review of a Product
export const deleteReviews = (reviewId, productId) => async dispatch => {
    try {
        dispatch({ type: DELETE_REVIEW_REQUEST });

        const { data } = await axios.delete(
            `/api/v1/reviews?id=${reviewId}&productId=${productId}`
        );

        dispatch({
            type: DELETE_REVIEW_SUCCESS,
            payload: data.success
        });
    } catch (error) {
        dispatch({
            type: DELETE_REVIEW_FAIL,
            payload: error.response.data.message
        });
    }
};

export const fetchWishlist = () => async dispatch => {
    try {
        dispatch({ type: ALL_WISHLIST_PRODUCTS_REQUEST });

        // Assume you have an API endpoint to fetch wishlist products
        const { data } = await axios.get('/api/v1/wishlist');

        dispatch({
            type: ALL_WISHLIST_PRODUCTS_SUCCESS,
            payload: data.wishlistProducts
        });
    } catch (error) {
        dispatch({
            type: ALL_WISHLIST_PRODUCTS_FAIL,
            payload: error.response.data.message
        });
    }
};

export const addProductToWishlist = (id) => async dispatch => {
    try {
        dispatch({ type: ADD_PRODUCT_TO_WISHLIST_REQUEST });

        // Assume you have an API endpoint to add a product to the wishlist
        const { data } = await axios.post(`/api/v1/wishlist/${id}`);

        dispatch({
            type: ADD_PRODUCT_TO_WISHLIST_SUCCESS,
            payload: data.wishlist
        });
    } catch (error) {
        dispatch({
            type: ADD_PRODUCT_TO_WISHLIST_FAIL,
            payload: error.response.data.message
        });
    }
};

export const removeProductFromWishlist = id => async dispatch => {
           try {
               dispatch({ type: REMOVE_PRODUCT_FROM_WISHLIST_REQUEST });

               // Assume you have an API endpoint to remove a product from the wishlist
               const { data } = await axios.delete(`/api/v1/wishlist/${id}`);

               dispatch({
                   type: REMOVE_PRODUCT_FROM_WISHLIST_SUCCESS,
                   payload: data.wishlist
               });
           } catch (error) {
               dispatch({
                   type: REMOVE_PRODUCT_FROM_WISHLIST_FAIL,
                   payload:
                       error.response && error.response.data.message
                           ? error.response.data.message
                           : error.message
               });
           }
       };

// Clearing Errors
export const clearErrors = () => async dispatch => {
    dispatch({ type: CLEAR_ERRORS });
};

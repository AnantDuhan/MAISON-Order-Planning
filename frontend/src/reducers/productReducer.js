import {
    ALL_PRODUCT_FAIL,
    ALL_PRODUCT_REQUEST,
    ALL_PRODUCT_SUCCESS,
    ADMIN_PRODUCT_REQUEST,
    ADMIN_PRODUCT_SUCCESS,
    ADMIN_PRODUCT_FAIL,
    NEW_PRODUCT_REQUEST,
    NEW_PRODUCT_SUCCESS,
    NEW_PRODUCT_FAIL,
    NEW_PRODUCT_RESET,
    UPDATE_PRODUCT_REQUEST,
    UPDATE_PRODUCT_SUCCESS,
    UPDATE_PRODUCT_FAIL,
    UPDATE_PRODUCT_RESET,
    DELETE_PRODUCT_REQUEST,
    DELETE_PRODUCT_SUCCESS,
    DELETE_PRODUCT_FAIL,
    DELETE_PRODUCT_RESET,
    PRODUCT_DETAILS_REQUEST,
    PRODUCT_DETAILS_FAIL,
    PRODUCT_DETAILS_SUCCESS,
    NEW_REVIEW_REQUEST,
    NEW_REVIEW_SUCCESS,
    NEW_REVIEW_FAIL,
    NEW_REVIEW_RESET,
    ALL_REVIEW_REQUEST,
    ALL_REVIEW_SUCCESS,
    ALL_REVIEW_FAIL,
    DELETE_REVIEW_REQUEST,
    DELETE_REVIEW_SUCCESS,
    DELETE_REVIEW_FAIL,
    DELETE_REVIEW_RESET,
    ALL_WISHLIST_PRODUCTS_REQUEST,
    ALL_WISHLIST_PRODUCTS_SUCCESS,
    ALL_WISHLIST_PRODUCTS_FAIL,
    ADD_PRODUCT_TO_WISHLIST_REQUEST,
    ADD_PRODUCT_TO_WISHLIST_SUCCESS,
    ADD_PRODUCT_TO_WISHLIST_FAIL,
    REMOVE_PRODUCT_FROM_WISHLIST_REQUEST,
    REMOVE_PRODUCT_FROM_WISHLIST_SUCCESS,
    REMOVE_PRODUCT_FROM_WISHLIST_FAIL,
    SEARCH_PRODUCTS_REQUEST,
    SEARCH_PRODUCTS_SUCCESS,
    SEARCH_PRODUCTS_FAIL,
    SUMMARIZE_REVIEWS_REQUEST,
    SUMMARIZE_REVIEWS_SUCCESS,
    SUMMARIZE_REVIEWS_FAIL,
    SUMMARIZE_REVIEWS_RESET,
    CLEAR_ERRORS,
    REALTIME_PRODUCT_UPDATE
} from '../constants/productConstants';

export const productsReducer = (state = { products: [] }, action) => {
    switch (action.type) {
        case ALL_PRODUCT_REQUEST:
        case ADMIN_PRODUCT_REQUEST:
            return {
                loading: true,
                products: [],
            };
        case ALL_PRODUCT_SUCCESS:
            return {
                loading: false,
                products: action.payload.products,
                productsCount: action.payload.productsCount,
                resultPerPage: action.payload.resultPerPage,
                filteredProductsCount: action.payload.filteredProductsCount,
            };

        case ADMIN_PRODUCT_SUCCESS:
            return {
                loading: false,
                products: action.payload,
            };
        case ALL_PRODUCT_FAIL:
        case ADMIN_PRODUCT_FAIL:
            return {
                loading: false,
                error: action.payload,
            };

        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const newProductReducer = (state = { product: {} }, action) => {
    switch (action.type) {
        case NEW_PRODUCT_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case NEW_PRODUCT_SUCCESS:
            return {
                loading: false,
                success: action.payload.success,
                product: action.payload.product,
            };
        case NEW_PRODUCT_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case NEW_PRODUCT_RESET:
            return {
                ...state,
                success: false,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const productReducer = (state = {}, action) => {
    switch (action.type) {
        case DELETE_PRODUCT_REQUEST:
        case UPDATE_PRODUCT_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case DELETE_PRODUCT_SUCCESS:
            return {
                ...state,
                loading: false,
                isDeleted: action.payload,
            };

        case UPDATE_PRODUCT_SUCCESS:
            return {
                ...state,
                loading: false,
                isUpdated: action.payload,
            };
        case DELETE_PRODUCT_FAIL:
        case UPDATE_PRODUCT_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case DELETE_PRODUCT_RESET:
            return {
                ...state,
                isDeleted: false,
            };
        case UPDATE_PRODUCT_RESET:
            return {
                ...state,
                isUpdated: false,
            };
        case REALTIME_PRODUCT_UPDATE:
            return {
                ...state,
                product: action.payload, // Replace the product data with the new data from the socket
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const productDetailsReducer = (state = { product: {} }, action) => {
    switch (action.type) {
        case PRODUCT_DETAILS_REQUEST:
            return {
                loading: true,
                ...state,
            };
        case PRODUCT_DETAILS_SUCCESS:
            return {
                loading: false,
                product: action.payload,
            };
        case PRODUCT_DETAILS_FAIL:
            return {
                loading: false,
                error: action.payload,
            };

        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const newReviewReducer = (state = {}, action) => {
    switch (action.type) {
        case NEW_REVIEW_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case NEW_REVIEW_SUCCESS:
            return {
                loading: false,
                success: action.payload,
            };
        case NEW_REVIEW_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case NEW_REVIEW_RESET:
            return {
                ...state,
                success: false,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const productReviewsReducer = (state = { reviews: [] }, action) => {
    switch (action.type) {
        case ALL_REVIEW_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case ALL_REVIEW_SUCCESS:
            return {
                loading: false,
                reviews: action.payload,
            };
        case ALL_REVIEW_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };

        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

export const reviewReducer = (state = {}, action) => {
    switch (action.type) {
        case DELETE_REVIEW_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case DELETE_REVIEW_SUCCESS:
            return {
                ...state,
                loading: false,
                isDeleted: action.payload,
            };
        case DELETE_REVIEW_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case DELETE_REVIEW_RESET:
            return {
                ...state,
                isDeleted: false,
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
};

const initialState = {
    wishlist: [],
    loading: false,
    error: null,
}

export const wishlistReducer = (state = initialState, action) => {
    switch (action.type) {
        case ALL_WISHLIST_PRODUCTS_REQUEST:
        case ADD_PRODUCT_TO_WISHLIST_REQUEST:
        case REMOVE_PRODUCT_FROM_WISHLIST_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };

        case ALL_WISHLIST_PRODUCTS_SUCCESS:
            return {
                ...state,
                loading: false,
                wishlist: action.payload
            };

        case ADD_PRODUCT_TO_WISHLIST_SUCCESS:
        case REMOVE_PRODUCT_FROM_WISHLIST_SUCCESS:
            return {
                ...state,
                loading: false,
                wishlist: action.payload
            };

        case ALL_WISHLIST_PRODUCTS_FAIL:
        case ADD_PRODUCT_TO_WISHLIST_FAIL:
        case REMOVE_PRODUCT_FROM_WISHLIST_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload
            };

        default:
            return state;
    }
};

// export const recommendedProductsReducer = (state = { products: [] }, action) => {
//     switch (action.type) {
//         case RECOMMENDED_PRODUCTS_REQUEST:
//             return {
//                 loading: true,
//                 products: [],
//             };
//         case RECOMMENDED_PRODUCTS_SUCCESS:
//             return {
//                 loading: false,
//                 products: action.payload,
//             };
//         case RECOMMENDED_PRODUCTS_FAIL:
//             return {
//                 loading: false,
//                 error: action.payload,
//             };
//         default:
//             return state;
//     }
// };

export const productsSearchReducer = (state = { products: [] }, action) => {
    switch (action.type) {
        case SEARCH_PRODUCTS_REQUEST:
            return {
                loading: true,
                products: [], 
            };

        case SEARCH_PRODUCTS_SUCCESS:
            return {
                loading: false,
                products: action.payload.products,
            };

        case SEARCH_PRODUCTS_FAIL:
            return {
                loading: false,
                error: action.payload,
            };

        case CLEAR_ERRORS:
            return {
                ...state,
                error: null,
            };

        default:
            return state;
    }
};

export const summarizeReviewsReducer = (state = {}, action) => {
    switch (action.type) {
        case SUMMARIZE_REVIEWS_REQUEST:
            return {
                ...state,
                loading: true,
            };
        case SUMMARIZE_REVIEWS_SUCCESS:
            return {
                loading: false,
                isSummarized: action.payload,
            };
        case SUMMARIZE_REVIEWS_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case SUMMARIZE_REVIEWS_RESET:
            return {
                ...state,
                isSummarized: false,
            };
        default:
            return state;
    }
};

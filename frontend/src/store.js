import { applyMiddleware, combineReducers, createStore } from 'redux';
import { composeWithDevTools } from '@redux-devtools/extension';
import thunk from 'redux-thunk';

import { cartReducer } from './reducers/cartReducer';
import {
    allOrdersReducer,
    myOrdersReducer,
    newOrderReducer,
    orderDetailsReducer,
    orderReducer,
    returnRequestReducer,
    initiateRefundReducer,
    refundStatusUpdateReducer,
    allRefundsReducer,
    allReturnsReducer
} from './reducers/orderReducer';
import {
    newProductReducer,
    newReviewReducer,
    productDetailsReducer,
    productReducer,
    productReviewsReducer,
    productsReducer,
    reviewReducer,
    wishlistReducer,
    productsSearchReducer
} from './reducers/productReducer';
import {
    allUsersReducer,
    forgotPasswordReducer,
    profileReducer,
    userDetailsReducer,
    userReducer,
} from './reducers/userReducer';
import { couponReducer } from './reducers/couponReducer';
import { contactReducer } from './reducers/contactReducer';
import { subscribeReducer } from './reducers/subscribeReducer';
import subscriptionReducer from './reducers/subscriptionReducer';

const reducer = combineReducers({
    // product reducer
    products: productsReducer,
    productDetails: productDetailsReducer,
    newProduct: newProductReducer,
    newReview: newReviewReducer,
    productReviews: productReviewsReducer,
    product: productReducer,
    review: reviewReducer,
    wishlist: wishlistReducer,
    // recommendedProducts: recommendedProductsReducer,
    productsSearch: productsSearchReducer,

    // user reducer
    user: userReducer,
    profile: profileReducer,
    forgotPassword: forgotPasswordReducer,
    allUsers: allUsersReducer,
    userDetails: userDetailsReducer,

    // cart reducer
    cart: cartReducer,

    // order reducer
    newOrder: newOrderReducer,
    myOrders: myOrdersReducer,
    allOrders: allOrdersReducer,
    order: orderReducer,
    orderDetails: orderDetailsReducer,
    returnRequest: returnRequestReducer,
    initiateRefund: initiateRefundReducer,
    refundStatusUpdate: refundStatusUpdateReducer,
    allRefunds: allRefundsReducer,
    allReturns: allReturnsReducer,

    // coupon reducer
    coupon: couponReducer,

    // contact reducer
    contact: contactReducer,

    // subscribe reducer
    subscribe: subscribeReducer,

    // plus subscription reducer
    plusSubscription: subscriptionReducer,
});

let initialState = {
    cart: {
        cartItems: localStorage.getItem('cartItems')
            ? JSON.parse(localStorage.getItem('cartItems'))
            : [],
        shippingInfo: localStorage.getItem('shippingInfo')
            ? JSON.parse(localStorage.getItem('shippingInfo'))
            : {},
    },
};

const middleware = [thunk];

const store = createStore(
    reducer,
    initialState,
    composeWithDevTools(applyMiddleware(...middleware))
);

export default store;

import {
    GENERATE_COUPON_SUCCESS,
    GENERATE_COUPON_REQUEST,
    GENERATE_COUPON_FAIL,
    FETCH_COUPONS_SUCCESS,
    FETCH_COUPONS_REQUEST,
    FETCH_COUPONS_FAIL
} from '../constants/couponConstants';

const initialState = {
    loading: false,
    success: false,
    coupon: null,
    coupons: [],
    error: ''
};

export const couponReducer = (state = initialState, action) => {
    switch (action.type) {
        case GENERATE_COUPON_REQUEST:
        case FETCH_COUPONS_REQUEST:
            return {
                ...state,
                loading: true
            };
        case GENERATE_COUPON_SUCCESS:
            return {
                ...state,
                loading: false,
                success: true,
                coupon: action.payload
            };
        case FETCH_COUPONS_SUCCESS:
            return {
                ...state,
                loading: false,
                success: true,
                coupons: action.payload
            };
        case GENERATE_COUPON_FAIL:
        case FETCH_COUPONS_FAIL:
            return {
                ...state,
                loading: false,
                success: false,
                error: action.payload
            };
        default:
            return state;
    }
};

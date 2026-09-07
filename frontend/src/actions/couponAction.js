import {
    GENERATE_COUPON_SUCCESS,
    GENERATE_COUPON_REQUEST,
    GENERATE_COUPON_FAIL,
    GENERATE_COUPON_RESET,
    FETCH_COUPONS_SUCCESS,
    FETCH_COUPONS_REQUEST,
    FETCH_COUPONS_FAIL,
    CLEAR_ERRORS
} from '../constants/couponConstants';
import axios from 'axios';

// Create a coupon. `expiresAt` is optional — omit it to let the API default
// to a 7-day window.
export const generateCoupon = (code, discount, expiresAt) => async dispatch => {
    try {
        dispatch({ type: GENERATE_COUPON_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };

        const body = { code, discount };
        if (expiresAt) body.expiresAt = expiresAt;

        const { data } = await axios.post(`/api/v1/coupon`, body, config);

        dispatch({ type: GENERATE_COUPON_SUCCESS, payload: data.coupon });
    } catch (error) {
        dispatch({
            type: GENERATE_COUPON_FAIL,
            payload: error.response?.data?.message || 'Coupon creation failed'
        });
    }
};

export const getAllCoupons = () => async dispatch => {
    try {
        dispatch({ type: FETCH_COUPONS_REQUEST });

        const { data } = await axios.get(`/api/v1/coupons/all`);

        dispatch({ type: FETCH_COUPONS_SUCCESS, payload: data.coupons });
    } catch (error) {
        dispatch({
            type: FETCH_COUPONS_FAIL,
            payload: error.response?.data?.message || 'Failed to fetch coupons'
        });
    }
};

export const resetCouponState = () => async dispatch => {
    dispatch({ type: GENERATE_COUPON_RESET });
};

export const clearErrors = () => async dispatch => {
    dispatch({ type: CLEAR_ERRORS });
};

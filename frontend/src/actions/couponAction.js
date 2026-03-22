import {
    GENERATE_COUPON_SUCCESS,
    GENERATE_COUPON_REQUEST,
    GENERATE_COUPON_FAIL,
    FETCH_COUPONS_SUCCESS,
    FETCH_COUPONS_REQUEST,
    FETCH_COUPONS_FAIL
} from '../constants/couponConstants';
import axios from 'axios';

export const generateCoupon = (code, discount) => async dispatch => {
    try {
        dispatch({ type: GENERATE_COUPON_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const { data } = await axios.post(
            `/api/v1/coupon`,
            { code, discount },
            { config }
        );

        console.log('coupons', data);

        dispatch({ type: GENERATE_COUPON_SUCCESS, payload: data.coupons });
    } catch (error) {
        dispatch({
            type: GENERATE_COUPON_FAIL,
            payload: error.response.data.message
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
            payload: error.response.data.message
        });
    }
};

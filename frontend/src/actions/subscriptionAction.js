import axios from 'axios';

import {
    CREATE_SUBSCRIPTION_REQUEST,
    CREATE_SUBSCRIPTION_SUCCESS,
    CREATE_SUBSCRIPTION_FAIL,
    SUBSCRIPTION_REQUEST,
    SUBSCRIPTION_SUCCESS,
    SUBSCRIPTION_FAIL,
    GET_SUBSCRIPTION_DETAIL_REQUEST,
    GET_SUBSCRIPTION_DETAIL_SUCCESS,
    GET_SUBSCRIPTION_DETAIL_FAIL,
    UPDATE_SUBSCRIPTION_REQUEST,
    UPDATE_SUBSCRIPTION_SUCCESS,
    UPDATE_SUBSCRIPTION_FAIL,
    CANCEL_SUBSCRIPTION_REQUEST,
    CANCEL_SUBSCRIPTION_SUCCESS,
    CANCEL_SUBSCRIPTION_FAIL,
    DELETE_SUBSCRIPTION_REQUEST,
    DELETE_SUBSCRIPTION_SUCCESS,
    DELETE_SUBSCRIPTION_FAIL,
    CLEAR_SUBSCRIPTION,
    CLEAR_ERRORS,
    ALL_PRICES_REQUEST,
    ALL_PRICES_SUCCESS,
    ALL_PRICES_FAIL
} from '../constants/subscriptionConstants';

export const getAllPrices = () => async dispatch => {
    try {
        dispatch({ type: ALL_PRICES_REQUEST });

        const { data } = await axios.get('/api/v1/prices/all');

        dispatch({ type: ALL_PRICES_SUCCESS, payload: data.prices.data });
    } catch (error) {
        dispatch({
            type: ALL_PRICES_FAIL,
            payload: error.response.data.message
        });
    }
};

export const createSubscription = (myForm) => async dispatch => {
    try {
        dispatch({ type: CREATE_SUBSCRIPTION_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const { data } = await axios.post(
            '/api/v1/admin/create-subscription',
            { myForm },
            {
                config
            }
        );

        dispatch({ type: CREATE_SUBSCRIPTION_SUCCESS, payload: data.subscription });
    } catch (error) {
        dispatch({
            type: CREATE_SUBSCRIPTION_FAIL,
            payload: error.response.data.message
        });
    }
};

export const getAllSubscription = () => async dispatch => {
    try {
        dispatch({ type: SUBSCRIPTION_REQUEST });

        const { data } = await axios.get(
            '/api/v1/admin/subscriptions');

        dispatch({
            type: SUBSCRIPTION_SUCCESS,
            payload: data.subscriptions
        });
    } catch (error) {
        dispatch({
            type: SUBSCRIPTION_FAIL,
            payload: error.response.data.message
        });
    }
};

export const getSubscriptionDetails = (id) => async dispatch => {
    try {
        dispatch({ type: GET_SUBSCRIPTION_DETAIL_REQUEST });

        const { data } = await axios.get(`/api/v1/admin/subscription/${id}`);

        dispatch({
            type: GET_SUBSCRIPTION_DETAIL_SUCCESS,
            payload: data.subscription
        });
    } catch (error) {
        dispatch({
            type: GET_SUBSCRIPTION_DETAIL_FAIL,
            payload: error.response.data.message
        });
    }
};

export const updateSubscriptionById = (id, myForm) => async dispatch => {
    try {
        dispatch({ type: UPDATE_SUBSCRIPTION_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const { data } = await axios.put(
            `/api/v1/admin/subscription/${id}`,
            { myForm },
            {
                config
            }
        );

        console.log('data', data);

        dispatch({
            type: UPDATE_SUBSCRIPTION_SUCCESS,
            payload: data.subscription
        });
    } catch (error) {
        dispatch({
            type: UPDATE_SUBSCRIPTION_FAIL,
            payload: error.response.data.message
        });
    }
};

export const deleteSubscription = (id) => async dispatch => {
    try {
        dispatch({ type: DELETE_SUBSCRIPTION_REQUEST });

        const { data } = await axios.delete(
            `/api/v1/admin/subscription/${id}`);

        dispatch({
            type: DELETE_SUBSCRIPTION_SUCCESS,
            payload: data.success
        });
    } catch (error) {
        dispatch({
            type: DELETE_SUBSCRIPTION_FAIL,
            payload: error.response.data.message
        });
    }
};


export const cancelSubscription = (id) => async dispatch => {
    try {
        dispatch({ type: CANCEL_SUBSCRIPTION_REQUEST });

        const { data } = await axios.put(`/api/v1/admin/subscription/${id}/cancel`);

        dispatch({
            type: CANCEL_SUBSCRIPTION_SUCCESS,
            payload: data.success
        });
    } catch (error) {
        dispatch({
            type: CANCEL_SUBSCRIPTION_FAIL,
            payload: error.response.data.message
        });
    }
};

export const clearSubscription = () => dispatch => {
    dispatch({ type: CLEAR_SUBSCRIPTION });
};

export const clearErrors = () => dispatch => {
    dispatch({ type: CLEAR_ERRORS });
};

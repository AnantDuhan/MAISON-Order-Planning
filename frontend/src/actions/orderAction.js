import {
    CREATE_ORDER_REQUEST,
    CREATE_ORDER_SUCCESS,
    CREATE_ORDER_FAIL,
    MY_ORDERS_REQUEST,
    MY_ORDERS_SUCCESS,
    MY_ORDERS_FAIL,
    ALL_ORDERS_REQUEST,
    ALL_ORDERS_SUCCESS,
    ALL_ORDERS_FAIL,
    UPDATE_ORDER_REQUEST,
    UPDATE_ORDER_SUCCESS,
    UPDATE_ORDER_FAIL,
    DELETE_ORDER_REQUEST,
    DELETE_ORDER_SUCCESS,
    DELETE_ORDER_FAIL,
    ORDER_DETAILS_REQUEST,
    ORDER_DETAILS_SUCCESS,
    ORDER_DETAILS_FAIL,
    REQUEST_RETURN_REQUEST,
    REQUEST_RETURN_SUCCESS,
    REQUEST_RETURN_FAIL,
    INITIATE_REFUND_REQUEST,
    INITIATE_REFUND_SUCCESS,
    INITIATE_REFUND_FAIL,
    REFUND_STATUS_UPDATE_REQUEST,
    REFUND_STATUS_UPDATE_SUCCESS,
    REFUND_STATUS_UPDATE_FAIL,
    ALL_RETURNS_REQUEST,
    ALL_RETURNS_SUCCESS,
    ALL_RETURNS_FAIL,
    ALL_REFUNDS_REQUEST,
    ALL_REFUNDS_SUCCESS,
    ALL_REFUNDS_FAIL,
    CLEAR_ERRORS
} from '../constants/orderConstants';

import axios from 'axios';

// Create Order
export const createOrder = order => async dispatch => {
    try {
        dispatch({ type: CREATE_ORDER_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const { data } = await axios.post('/api/v1/order/new', order, {
            config
        });

        dispatch({ type: CREATE_ORDER_SUCCESS, payload: data });
    } catch (error) {
        dispatch({
            type: CREATE_ORDER_FAIL,
            payload: error.response.data.message
        });
    }
};

// My Orders
export const myOrders = () => async dispatch => {
    try {
        dispatch({ type: MY_ORDERS_REQUEST });

        const { data } = await axios.get('/api/v1/orders/me');

        dispatch({ type: MY_ORDERS_SUCCESS, payload: data.orders });
    } catch (error) {
        dispatch({
            type: MY_ORDERS_FAIL,
            payload: error.response.data.message
        });
    }
};

// Get All Orders - admin
export const getAllOrders = () => async dispatch => {
    try {
        dispatch({ type: ALL_ORDERS_REQUEST });

        const { data } = await axios.get('/api/v1/admin/orders');

        dispatch({ type: ALL_ORDERS_SUCCESS, payload: data.orders });
    } catch (error) {
        dispatch({
            type: ALL_ORDERS_FAIL,
            payload: error.response.data.message
        });
    }
};

// Update Order
export const updateOrder = (id, status) => async dispatch => {
    try {
        dispatch({ type: UPDATE_ORDER_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        const { data } = await axios.put(
            `/api/v1/admin/order/${id}`,
            { status },
            { config }
        );

        dispatch({ type: UPDATE_ORDER_SUCCESS, payload: data.success });
    } catch (error) {
        dispatch({
            type: UPDATE_ORDER_FAIL,
            payload: error.response.data.message
        });
    }
};

// Delete Order
export const deleteOrder = id => async dispatch => {
    try {
        dispatch({ type: DELETE_ORDER_REQUEST });

        const { data } = await axios.delete(`/api/v1/admin/order/${id}`);

        dispatch({ type: DELETE_ORDER_SUCCESS, payload: data.success });
    } catch (error) {
        dispatch({
            type: DELETE_ORDER_FAIL,
            payload: error.response.data.message
        });
    }
};

// Get Order Details
export const getOrderDetails = id => async dispatch => {
    try {
        dispatch({ type: ORDER_DETAILS_REQUEST });

        const { data } = await axios.get(`/api/v1/order/${id}`);

        dispatch({ type: ORDER_DETAILS_SUCCESS, payload: data.order });
    } catch (error) {
        dispatch({
            type: ORDER_DETAILS_FAIL,
            payload: error.response.data.message
        });
    }
};

export const returnRequest = (id, returnReason) => async dispatch => {
    try {
        dispatch({ type: REQUEST_RETURN_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const { data } = await axios.post(
            `/api/v1/order/${id}/return`,
            { returnReason },
            { config }
        );

        dispatch({
            type: REQUEST_RETURN_SUCCESS,
            payload: data.order
        });
    } catch (error) {
        dispatch({
            type: REQUEST_RETURN_FAIL,
            payload: error.response.data.message
        });
    }
};

export const initiateRefund = id => async dispatch => {
    try {
        dispatch({ type: INITIATE_REFUND_REQUEST });

        const { data } = await axios.post(`/api/v1/admin/order/${id}/refund`);

        dispatch({ type: INITIATE_REFUND_SUCCESS, payload: data.order });
    } catch (error) {
        dispatch({
            type: INITIATE_REFUND_FAIL,
            payload: error.response.data.message
        });
    }
};

export const updateRefundStatus = (
    orderId,
    refundId,
    refundStatus
) => async dispatch => {
    try {
        dispatch({ type: REFUND_STATUS_UPDATE_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const body = JSON.stringify({ refundStatus });

        await axios.patch(
            `/api/v1/admin/order/${orderId}/refund/${refundId}/status`,
            { body },
            { config }
        );

        dispatch({
            type: REFUND_STATUS_UPDATE_SUCCESS,
            payload: { orderId, refundId, refundStatus }
            // payload: data.order
        });
    } catch (error) {
        dispatch({
            type: REFUND_STATUS_UPDATE_FAIL,
            payload: error.response.data.message
        });
    }
};

export const allRefunds = () => async dispatch => {
    try {
        dispatch({ type: ALL_REFUNDS_REQUEST });

        const { data } = await axios.get(`/api/v1/admin/refunds`);

        dispatch({ type: ALL_REFUNDS_SUCCESS, payload: data.refunds });
    } catch (error) {
        dispatch({
            type: ALL_REFUNDS_FAIL,
            payload: error.response.data.message
        });
    }
};

export const allReturns = () => async dispatch => {
    try {
        dispatch({ type: ALL_RETURNS_REQUEST });

        const { data } = await axios.get(`/api/v1/admin/returns`);

        dispatch({ type: ALL_RETURNS_SUCCESS, payload: data.returns });
    } catch (error) {
        dispatch({
            type: ALL_RETURNS_FAIL,
            payload: error.response.data.message
        });
    }
};

// Clearing Errors
export const clearErrors = () => async dispatch => {
    dispatch({ type: CLEAR_ERRORS });
};

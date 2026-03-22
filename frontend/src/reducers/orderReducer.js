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
    UPDATE_ORDER_RESET,
    DELETE_ORDER_REQUEST,
    DELETE_ORDER_SUCCESS,
    DELETE_ORDER_FAIL,
    DELETE_ORDER_RESET,
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

export const newOrderReducer = (state = {}, action) => {
    switch (action.type) {
        case CREATE_ORDER_REQUEST:
            return {
                ...state,
                loading: true,
            };

        case CREATE_ORDER_SUCCESS:
            return {
                loading: false,
                order: action.payload,
            };

        case CREATE_ORDER_FAIL:
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

export const myOrdersReducer = (state = { orders: [] }, action) => {
    switch (action.type) {
        case MY_ORDERS_REQUEST:
            return {
                loading: true,
                orders: []
            };

        case MY_ORDERS_SUCCESS:
            return {
                loading: false,
                orders: action.payload.orders ? action.payload.orders : action.payload, 
            };

        case MY_ORDERS_FAIL:
            return {
                loading: false,
                error: action.payload,
                orders: []
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

export const allOrdersReducer = (state = { orders: [] }, action) => {
    switch (action.type) {
        case ALL_ORDERS_REQUEST:
            return {
                loading: true,
                orders: []
            };

        case ALL_ORDERS_SUCCESS:
            return {
                loading: false,
                orders: action.payload.orders ? action.payload.orders : action.payload,
            };

        case ALL_ORDERS_FAIL:
            return {
                loading: false,
                error: action.payload,
                orders: []
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

export const orderReducer = (state = {}, action) => {
    switch (action.type) {
        case UPDATE_ORDER_REQUEST:
        case DELETE_ORDER_REQUEST:
            return {
                ...state,
                loading: true,
            };

        case UPDATE_ORDER_SUCCESS:
            return {
                ...state,
                loading: false,
                isUpdated: action.payload,
            };

        case DELETE_ORDER_SUCCESS:
            return {
                ...state,
                loading: false,
                isDeleted: action.payload,
            };

        case UPDATE_ORDER_FAIL:
        case DELETE_ORDER_FAIL:
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case UPDATE_ORDER_RESET:
            return {
                ...state,
                isUpdated: false,
            };

        case DELETE_ORDER_RESET:
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

export const orderDetailsReducer = (state = { order: {} }, action) => {
    switch (action.type) {
        case ORDER_DETAILS_REQUEST:
            return {
                ...state,
                loading: true,
            };

        case ORDER_DETAILS_SUCCESS:
            return {
                loading: false,
                order: action.payload,
            };

        case ORDER_DETAILS_FAIL:
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

export const returnRequestReducer = (state = {}, action) => {
    switch (action.type) {
        case REQUEST_RETURN_REQUEST:
            return {
                loading: true
            };

        case REQUEST_RETURN_SUCCESS:
            return {
                loading: false,
                success: true,
                order: action.payload
            };

        case REQUEST_RETURN_FAIL:
            return {
                loading: false,
                error: action.payload
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null
            };

        default:
            return state;
    }
};

export const initiateRefundReducer = (state = {}, action) => {
    switch (action.type) {
        case INITIATE_REFUND_REQUEST:
            return {
                loading: true
            };

        case INITIATE_REFUND_SUCCESS:
            return {
                loading: false,
                success: true,
                order: action.payload
            };

        case INITIATE_REFUND_FAIL:
            return {
                loading: false,
                error: action.payload
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null
            };

        default:
            return state;
    }
};

export const refundStatusUpdateReducer = (state = {}, action) => {
    switch (action.type) {
        case REFUND_STATUS_UPDATE_REQUEST:
            return {
                loading: true
            };

        case REFUND_STATUS_UPDATE_SUCCESS:
            return {
                loading: false,
                success: true,
                order: action.payload
            };

        case REFUND_STATUS_UPDATE_FAIL:
            return {
                loading: false,
                error: action.payload
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null
            };

        default:
            return state;
    }
};

export const allRefundsReducer = (state = { refunds: [] }, action) => {
    switch (action.type) {
        case ALL_REFUNDS_REQUEST:
            return {
                loading: true,
                refunds: []
            };

        case ALL_REFUNDS_SUCCESS:
            return {
                loading: false,
                refunds: action.payload.refunds ? action.payload.refunds : (action.payload || [])
            };

        case ALL_REFUNDS_FAIL:
            return {
                loading: false,
                error: action.payload,
                refunds: []
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null
            };

        default:
            return state;
    }
};

export const allReturnsReducer = (state = { returns: [] }, action) => {
    switch (action.type) {
        case ALL_RETURNS_REQUEST:
            return {
                ...state,
                loading: true
            };

        case ALL_RETURNS_SUCCESS:
            return {
                loading: false,
                returns: action.payload.returns ? action.payload.returns : (action.payload || [])
            };

        case ALL_RETURNS_FAIL:
            return {
                loading: false,
                error: action.payload,
                returns: []
            };
        case CLEAR_ERRORS:
            return {
                ...state,
                error: null
            };

        default:
            return state;
    }
};


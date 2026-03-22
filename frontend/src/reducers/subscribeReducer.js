import { CLEAR_ERRORS, CLEAR_SUBSCRIBE, SUBSCRIBE_FAIL, SUBSCRIBE_REQUEST, SUBSCRIBE_SUCCESS } from '../constants/subscribeConstants';

const initialState = {
    loading: false,
    success_subscribe: false,
    error_subscribe: null,
};

export const subscribeReducer = (state = initialState, action) => {
    switch (action.type) {
        case SUBSCRIBE_REQUEST:
            return {
                ...state,
                loading: true
            };

        case SUBSCRIBE_SUCCESS:
            return {
                ...state,
                loading: false,
                success: true,
                error: null
            };

        case SUBSCRIBE_FAIL:
            return {
                ...state,
                loading: false,
                success: false,
                error: action.payload
            };

        case CLEAR_SUBSCRIBE:
            return {
                ...state,
                loading: false,
                success: false,
                error: null
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

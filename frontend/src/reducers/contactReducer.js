import {
    CONTACT_REQUEST,
    CONTACT_SUCCESS,
    CONTACT_FAIL,
    CLEAR_CONTACT
} from '../constants/contactConstants';

const initialState = {
    loading: false,
    success: false,
    error: null
};

export const contactReducer = (state = initialState, action) => {
    switch (action.type) {
        case CONTACT_REQUEST:
            return {
                ...state,
                loading: true,
                success: false,
                error: null
            };
        case CONTACT_SUCCESS:
            return {
                ...state,
                loading: false,
                success: true,
                error: null
            };
        case CONTACT_FAIL:
            return {
                ...state,
                loading: false,
                success: false,
                error: action.payload
            };
        case CLEAR_CONTACT:
            return initialState;
        default:
            return state;
    }
};

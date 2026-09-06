import {
    ANALYTICS_REQUEST,
    ANALYTICS_SUCCESS,
    ANALYTICS_FAIL,
    CLEAR_ERRORS,
} from '../constants/analyticsConstants';

const initialState = {
    loading: false,
    analytics: null,
    range: '30d',
    granularity: 'day',
    error: null,
};

export const analyticsReducer = (state = initialState, action) => {
    switch (action.type) {
        case ANALYTICS_REQUEST:
            return { ...state, loading: true };

        case ANALYTICS_SUCCESS:
            return {
                ...state,
                loading: false,
                analytics: action.payload.analytics,
                range: action.payload.range,
                granularity: action.payload.granularity,
                error: null,
            };

        case ANALYTICS_FAIL:
            return { ...state, loading: false, error: action.payload };

        case CLEAR_ERRORS:
            return { ...state, error: null };

        default:
            return state;
    }
};

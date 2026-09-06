import axios from 'axios';

import {
    ANALYTICS_REQUEST,
    ANALYTICS_SUCCESS,
    ANALYTICS_FAIL,
    ADMIN_STATS_REQUEST,
    ADMIN_STATS_SUCCESS,
    ADMIN_STATS_FAIL,
    CLEAR_ERRORS,
} from '../constants/analyticsConstants';

// range: '7d' | '30d' | '90d' | '12m' | 'all'
export const getAnalytics = (range = '30d') => async dispatch => {
    try {
        dispatch({ type: ANALYTICS_REQUEST });

        const { data } = await axios.get(`/api/v1/admin/analytics?range=${range}`);

        dispatch({
            type: ANALYTICS_SUCCESS,
            payload: {
                analytics: data.analytics,
                range: data.range,
                granularity: data.granularity,
            },
        });
    } catch (error) {
        dispatch({
            type: ANALYTICS_FAIL,
            payload:
                error.response?.data?.message || 'Could not load analytics',
        });
    }
};

// Counts only — replaces five full-collection fetches.
export const getAdminStats = () => async dispatch => {
    try {
        dispatch({ type: ADMIN_STATS_REQUEST });

        const { data } = await axios.get('/api/v1/admin/stats');

        dispatch({ type: ADMIN_STATS_SUCCESS, payload: data.stats });
    } catch (error) {
        dispatch({
            type: ADMIN_STATS_FAIL,
            payload: error.response?.data?.message || 'Could not load stats',
        });
    }
};

export const clearErrors = () => async dispatch => {
    dispatch({ type: CLEAR_ERRORS });
};

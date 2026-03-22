import axios from 'axios';
import {
    SUBSCRIBE_REQUEST,
    SUBSCRIBE_SUCCESS,
    SUBSCRIBE_FAIL,
    CLEAR_SUBSCRIBE
} from '../constants/subscribeConstants';

export const newsletter = email => async dispatch => {
    try {
        dispatch({ type: SUBSCRIBE_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const { data } = await axios.post(
            '/api/v1/subscribe',
            { email },
            {
                config
            }
        );

        console.log('data', data);

        dispatch({ type: SUBSCRIBE_SUCCESS, payload: data });
    } catch (error) {
        dispatch({
            type: SUBSCRIBE_FAIL,
            payload: error.response.data.message
        });
    }
};

export const clearNewsletter = () => dispatch => {
    dispatch({ type: CLEAR_SUBSCRIBE });
};

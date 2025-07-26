import {
    LOGIN_REQUEST,
    LOGIN_FAIL,
    LOGIN_SUCCESS,
    REGISTER_USER_REQUEST,
    REGISTER_USER_SUCCESS,
    REGISTER_USER_FAIL,
    LOAD_USER_REQUEST,
    LOAD_USER_SUCCESS,
    LOAD_USER_FAIL,
    LOGOUT_SUCCESS,
    LOGOUT_FAIL,
    UPDATE_PROFILE_REQUEST,
    UPDATE_PROFILE_SUCCESS,
    UPDATE_PROFILE_FAIL,
    UPDATE_PASSWORD_REQUEST,
    UPDATE_PASSWORD_SUCCESS,
    UPDATE_PASSWORD_FAIL,
    FORGOT_PASSWORD_REQUEST,
    FORGOT_PASSWORD_SUCCESS,
    FORGOT_PASSWORD_FAIL,
    RESET_PASSWORD_REQUEST,
    RESET_PASSWORD_SUCCESS,
    RESET_PASSWORD_FAIL,
    ALL_USERS_REQUEST,
    ALL_USERS_SUCCESS,
    ALL_USERS_FAIL,
    DELETE_USER_REQUEST,
    DELETE_USER_SUCCESS,
    DELETE_USER_FAIL,
    UPDATE_USER_REQUEST,
    UPDATE_USER_SUCCESS,
    UPDATE_USER_FAIL,
    USER_DETAILS_REQUEST,
    USER_DETAILS_SUCCESS,
    USER_DETAILS_FAIL,
    GOOGLE_LOGIN_REQUEST,
    GOOGLE_LOGIN_SUCCESS,
    GOOGLE_LOGIN_FAIL,
    OTP_SEND_REQUEST,
    OTP_SEND_SUCCESS,
    OTP_SEND_FAIL,
    OTP_LOGIN_REQUEST,
    OTP_LOGIN_SUCCESS,
    OTP_LOGIN_FAIL,
    LOGIN_2FA_REQUIRED,
    CLEAR_ERRORS,
} from '../constants/userConstants';
import axios from 'axios';

// Login
// Replace your existing login action with this
export const login = (email, password) => async (dispatch) => {
    try {
        dispatch({ type: LOGIN_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };

        const { data } = await axios.post(
            `/api/v1/login`,
            { email, password },
            { config }
        );

        if (data.twoFactorRequired) {
            dispatch({ type: LOGIN_2FA_REQUIRED, payload: { userId: data.userId } });
        } else {
            dispatch({ type: LOGIN_SUCCESS, payload: data.user });
            localStorage.setItem('authToken', data.token);
        }

    } catch (error) {
        dispatch({ type: LOGIN_FAIL, payload: error.response.data.message });
    }
};

// Register
export const register = (name, email, password, avatar) => async dispatch => {
    try {
        dispatch({ type: REGISTER_USER_REQUEST });

        const config = { headers: { 'Content-Type': 'multipart/form-data' } };

        const { data } = await axios.post(
            `/api/v1/register`,
            { name, email, password, avatar },
            { config }
        );

        dispatch({ type: REGISTER_USER_SUCCESS, payload: data.user });
    } catch (error) {
        dispatch({
            type: REGISTER_USER_FAIL,
            payload: error.response.data.message
        });
    }
};

// Load User
export const loadUser = () => async dispatch => {
    try {
        dispatch({ type: LOAD_USER_REQUEST });

        const { data } = await axios.get(`/api/v1/me`);

        dispatch({ type: LOAD_USER_SUCCESS, payload: data.user });
    } catch (error) {
        dispatch({
            type: LOAD_USER_FAIL,
            payload: error.response.data.message
        });
    }
};

// Logout User
export const logout = () => async dispatch => {
    try {
        await axios.get(`/api/v1/logout`);

        dispatch({ type: LOGOUT_SUCCESS });
    } catch (error) {
        dispatch({ type: LOGOUT_FAIL, payload: error.response.data.message });
    }
};

// Update Profile
export const updateProfile = (name, email, avatar) => async dispatch => {
    try {
        dispatch({ type: UPDATE_PROFILE_REQUEST });

        const config = { headers: { 'Content-Type': 'multipart/form-data' } };

        const { data } = await axios.put(
            `/api/me/update`,
            { name, email, avatar },
            { config }
        );

        dispatch({ type: UPDATE_PROFILE_SUCCESS, payload: data.success });
    } catch (error) {
        dispatch({
            type: UPDATE_PROFILE_FAIL,
            payload: error.response.data.message
        });
    }
};

// Update Password
export const updatePassword = passwords => async dispatch => {
    try {
        dispatch({ type: UPDATE_PASSWORD_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };

        const { data } = await axios.put(`/api/v1/password/update`, passwords, {
            config
        });

        dispatch({ type: UPDATE_PASSWORD_SUCCESS, payload: data.success });
    } catch (error) {
        dispatch({
            type: UPDATE_PASSWORD_FAIL,
            payload: error.response.data.message
        });
    }
};

// Forgot Password
export const forgotPassword = email => async dispatch => {
    try {
        dispatch({ type: FORGOT_PASSWORD_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };

        const { data } = await axios.post(`/api/v1/password/forgot`, email, {
            config
        });

        dispatch({ type: FORGOT_PASSWORD_SUCCESS, payload: data.message });
    } catch (error) {
        dispatch({
            type: FORGOT_PASSWORD_FAIL,
            payload: error.response.data.message
        });
    }
};

// Reset Password
export const resetPassword = (token, passwords) => async dispatch => {
    try {
        dispatch({ type: RESET_PASSWORD_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };

        const { data } = await axios.put(
            `/api/v1/password/reset/${token}`,
            passwords,
            { config }
        );

        dispatch({ type: RESET_PASSWORD_SUCCESS, payload: data.success });
    } catch (error) {
        dispatch({
            type: RESET_PASSWORD_FAIL,
            payload: error.response.data.message
        });
    }
};

// get All Users
export const getAllUsers = () => async dispatch => {
    try {
        dispatch({ type: ALL_USERS_REQUEST });
        const { data } = await axios.get(`/api/v1/admin/users`);

        dispatch({ type: ALL_USERS_SUCCESS, payload: data.users });
    } catch (error) {
        dispatch({
            type: ALL_USERS_FAIL,
            payload: error.response.data.message
        });
    }
};

// get User Details
export const getUserDetails = id => async dispatch => {
    try {
        dispatch({ type: USER_DETAILS_REQUEST });
        const { data } = await axios.get(`/api/v1/admin/user/${id}`);

        dispatch({ type: USER_DETAILS_SUCCESS, payload: data.user });
    } catch (error) {
        dispatch({
            type: USER_DETAILS_FAIL,
            payload: error.response.data.message
        });
    }
};

// Update User
export const updateUser = (id, userData) => async dispatch => {
    try {
        dispatch({ type: UPDATE_USER_REQUEST });

        const config = { headers: { 'Content-Type': 'application/json' } };

        const { data } = await axios.put(
            `/api/v1/admin/user/${id}`,
            { userData },
            { config }
        );

        console.log('DATA', data.user);

        dispatch({ type: UPDATE_USER_SUCCESS, payload: data.user });
    } catch (error) {
        dispatch({
            type: UPDATE_USER_FAIL,
            payload: error.response.data.message
        });

        console.log('ERROR', error);
    }
};

// Delete User
export const deleteUser = id => async dispatch => {
    try {
        dispatch({ type: DELETE_USER_REQUEST });

        const { data } = await axios.delete(`/api/v1/admin/user/${id}`);

        dispatch({ type: DELETE_USER_SUCCESS, payload: data.user });
    } catch (error) {
        dispatch({
            type: DELETE_USER_FAIL,
            payload: error.response.data.message
        });
    }
};

export const loginWithGoogle = (googleToken) => async (dispatch) => {
    try {
        dispatch({ type: GOOGLE_LOGIN_REQUEST });

        const config = { headers: { "Content-Type": "application/json" } };

        const { data } = await axios.post(
            `/api/v1/auth/google`,
            { token: googleToken },
            config
        );

        dispatch({ type: GOOGLE_LOGIN_SUCCESS, payload: data });

    } catch (error) {
        dispatch({
            type: GOOGLE_LOGIN_FAIL,
            payload: error.response.data.message,
        });
    }
};

// Send Login OTP
export const sendOtp = (whatsappNumber) => async (dispatch) => {
    try {
        dispatch({ type: OTP_SEND_REQUEST });
        const config = { headers: { "Content-Type": "application/json" } };
        const { data } = await axios.post(`/api/v1/otp/send`, { whatsappNumber }, config);
        dispatch({ type: OTP_SEND_SUCCESS, payload: data.message });
    } catch (error) {
        dispatch({ type: OTP_SEND_FAIL, payload: error.response.data.message });
    }
};

// Verify Login OTP
export const loginWithOtp = (whatsappNumber, otp) => async (dispatch) => {
    try {
        dispatch({ type: OTP_LOGIN_REQUEST });
        const config = { headers: { "Content-Type": "application/json" } };
        const { data } = await axios.post(`/api/v1/otp/verify`, { whatsappNumber, otp }, config);
        dispatch({ type: OTP_LOGIN_SUCCESS, payload: data });
    } catch (error) {
        dispatch({ type: OTP_LOGIN_FAIL, payload: error.response.data.message });
    }
};

// Clearing Errors
export const clearErrors = () => async dispatch => {
    dispatch({ type: CLEAR_ERRORS });
};

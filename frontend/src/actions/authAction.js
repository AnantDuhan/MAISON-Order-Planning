import { getRememberMe } from '../utils/rememberMe';
import axios from 'axios';
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';

import { LOGIN_2FA_REQUIRED, LOGIN_FAIL, LOGIN_REQUEST, LOGIN_SUCCESS } from '../constants/userConstants';

/* Passwordless sign-in: email code, magic link, phone OTP and passkeys.
   Every method ends like password login: either a session (LOGIN_SUCCESS)
   or the existing TOTP step (LOGIN_2FA_REQUIRED → /login/2fa). */

const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const finishLogin = (dispatch, data) => {
    if (data.twoFactorRequired) {
        dispatch({
            type: LOGIN_2FA_REQUIRED,
            payload: { token: data.twoFactorToken, enrollmentRequired: data.enrollmentRequired === true },
        });
    } else {
        dispatch({ type: LOGIN_SUCCESS, payload: data.user });
    }
    return data;
};

export const passkeysSupported = () => {
    try {
        return browserSupportsWebAuthn();
    } catch {
        return false;
    }
};

export const getLoginMethods = async () => {
    try {
        const { data } = await axios.get('/api/v1/login/methods');
        return data.methods;
    } catch {
        return { password: true, emailCode: true, phone: false, passkey: true };
    }
};

// Sends the code. Returns { ok, message } — not stored in Redux.
export const requestLoginCode = async (channel, identifier) => {
    try {
        const { data } =
            channel === 'email'
                ? await axios.post('/api/v1/login/email-code', { email: identifier })
                : await axios.post('/api/v1/login/phone-otp', { phone: identifier });
        return { ok: true, message: data.message };
    } catch (error) {
        return { ok: false, message: errorMessage(error, 'Could not send a code. Please try again.') };
    }
};

export const verifyLoginCode = (channel, identifier, code) => async dispatch => {
    try {
        dispatch({ type: LOGIN_REQUEST });
        const { data } =
            channel === 'email'
                ? await axios.post('/api/v1/login/email-code/verify', { email: identifier, code, rememberMe: getRememberMe() })
                : await axios.post('/api/v1/login/phone-otp/verify', { phone: identifier, code, rememberMe: getRememberMe() });
        return finishLogin(dispatch, data);
    } catch (error) {
        dispatch({ type: LOGIN_FAIL, payload: errorMessage(error, 'Sign-in failed. Please try again.') });
        return null;
    }
};

export const loginWithMagicLink = token => async dispatch => {
    try {
        dispatch({ type: LOGIN_REQUEST });
        const { data } = await axios.post('/api/v1/login/magic', { token, rememberMe: getRememberMe() });
        return finishLogin(dispatch, data);
    } catch (error) {
        dispatch({ type: LOGIN_FAIL, payload: errorMessage(error, 'This sign-in link is invalid or has expired.') });
        return null;
    }
};

export const loginWithPasskey = () => async dispatch => {
    try {
        dispatch({ type: LOGIN_REQUEST });
        const { data: start } = await axios.post('/api/v1/login/passkey/options');
        const response = await startAuthentication({ optionsJSON: start.options });
        const { data } = await axios.post('/api/v1/login/passkey/verify', {
            response,
            challengeToken: start.challengeToken,
            rememberMe: getRememberMe(),
        });
        return finishLogin(dispatch, data);
    } catch (error) {
        // Closing the browser prompt isn't an error worth a toast.
        const cancelled = error?.name === 'NotAllowedError' || error?.name === 'AbortError';
        dispatch({
            type: LOGIN_FAIL,
            payload: cancelled ? null : errorMessage(error, 'Passkey sign-in failed. Please try again.'),
        });
        return null;
    }
};

// ---- Passkey management (signed in) ----

export const fetchPasskeys = async () => {
    const { data } = await axios.get('/api/v1/passkeys');
    return data.passkeys;
};

export const addPasskey = async name => {
    const { data: start } = await axios.post('/api/v1/passkeys/register/options');
    const response = await startRegistration({ optionsJSON: start.options });
    const { data } = await axios.post('/api/v1/passkeys/register/verify', {
        response,
        challengeToken: start.challengeToken,
        name,
    });
    return data.passkeys;
};

export const removePasskey = async id => {
    const { data } = await axios.delete(`/api/v1/passkeys/${encodeURIComponent(id)}`);
    return data.passkeys;
};

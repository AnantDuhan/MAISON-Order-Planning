import {
  LOGIN_REQUEST,
  LOGIN_FAIL,
  LOGIN_SUCCESS,
  LOGIN_2FA_REQUIRED,
  LOGIN_2FA_REQUEST,
  LOGIN_2FA_SUCCESS,
  LOGIN_2FA_FAIL,
  TWO_FACTOR_SETUP_REQUEST,
  TWO_FACTOR_SETUP_SUCCESS,
  TWO_FACTOR_SETUP_FAIL,
  TWO_FACTOR_VERIFY_REQUEST,
  TWO_FACTOR_VERIFY_SUCCESS,
  TWO_FACTOR_VERIFY_FAIL,
  TWO_FACTOR_DISABLE_REQUEST,
  TWO_FACTOR_DISABLE_SUCCESS,
  TWO_FACTOR_DISABLE_FAIL,
  CLEAR_2FA_ERROR,
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
  UPDATE_PROFILE_RESET,
  UPDATE_PASSWORD_REQUEST,
  UPDATE_PASSWORD_SUCCESS,
  UPDATE_PASSWORD_RESET,
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
  DELETE_USER_RESET,
  UPDATE_USER_REQUEST,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_FAIL,
  UPDATE_USER_RESET,
  USER_DETAILS_REQUEST,
  USER_DETAILS_SUCCESS,
  USER_DETAILS_FAIL,
  GOOGLE_LOGIN_REQUEST,
  GOOGLE_LOGIN_SUCCESS,
  GOOGLE_LOGIN_FAIL,
  CLEAR_ERRORS,
} from "../constants/userConstants";

export const userReducer = (
  state = {
    user: {},
    loading: false,
    isAuthenticated: false,

    // 2FA login state
    twoFactorRequired: false,
    twoFactorToken: null,
    twoFactorEnrollmentRequired: false,

    // 2FA setup state
    twoFactorSetup: null,
    twoFactorLoading: false,
    twoFactorError: null,
  },
  action,
) => {
  switch (action.type) {
    // --------------------------------------------------
    // NORMAL LOGIN
    // --------------------------------------------------

    case LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,

        // Clear any previous 2FA login flow
        twoFactorRequired: false,
        twoFactorToken: null,
        twoFactorEnrollmentRequired: false,
      };

    // Backend tells us OTP is required
    case LOGIN_2FA_REQUIRED:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,

        twoFactorRequired: true,
        twoFactorToken: action.payload.token,
        twoFactorEnrollmentRequired: action.payload.enrollmentRequired === true,

        error: null,
      };

    // --------------------------------------------------
    // 2FA LOGIN / OTP
    // --------------------------------------------------

    case LOGIN_2FA_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case LOGIN_2FA_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,

        user: action.payload,

        // OTP flow completed
        twoFactorRequired: false,
        twoFactorToken: null,
        twoFactorEnrollmentRequired: false,

        error: null,
      };

    case LOGIN_2FA_FAIL:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,

        error: action.payload,
      };

    // --------------------------------------------------
    // NORMAL AUTH SUCCESS
    // --------------------------------------------------

    case REGISTER_USER_REQUEST:
    case LOAD_USER_REQUEST:
    case GOOGLE_LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case REGISTER_USER_SUCCESS:
      // Registration does NOT log the user in — they must verify their email
      // first. Surface the "check your inbox" message instead.
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        message: action.payload,
        error: null,
      };

    case LOGIN_SUCCESS:
    case LOAD_USER_SUCCESS:
    case GOOGLE_LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,

        user: action.payload,

        twoFactorRequired: false,
        twoFactorToken: null,
        twoFactorEnrollmentRequired: false,

        error: null,
      };

    // --------------------------------------------------
    // AUTH FAIL
    // --------------------------------------------------

    case LOGIN_FAIL:
    case REGISTER_USER_FAIL:
    case GOOGLE_LOGIN_FAIL:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,

        user: null,

        twoFactorRequired: false,
        twoFactorToken: null,
        twoFactorEnrollmentRequired: false,

        error: action.payload,
      };

    case LOAD_USER_FAIL:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };

    // --------------------------------------------------
    // LOGOUT
    // --------------------------------------------------

    case LOGOUT_SUCCESS:
      return {
        ...state,
        loading: false,
        user: null,
        isAuthenticated: false,

        twoFactorRequired: false,
        twoFactorToken: null,

        error: null,
      };

    case LOGOUT_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // --------------------------------------------------
    // 2FA SETUP
    // --------------------------------------------------

    case TWO_FACTOR_SETUP_REQUEST:
      return {
        ...state,
        twoFactorLoading: true,
        twoFactorError: null,
      };

    case TWO_FACTOR_SETUP_SUCCESS:
      return {
        ...state,
        twoFactorLoading: false,

        twoFactorSetup: action.payload,

        twoFactorError: null,
      };

    case TWO_FACTOR_SETUP_FAIL:
      return {
        ...state,
        twoFactorLoading: false,

        twoFactorError: action.payload,
      };

    // --------------------------------------------------
    // 2FA ENABLE / VERIFY
    // --------------------------------------------------

    case TWO_FACTOR_VERIFY_REQUEST:
      return {
        ...state,
        twoFactorLoading: true,
        twoFactorError: null,
      };

    case TWO_FACTOR_VERIFY_SUCCESS:
      return {
        ...state,
        twoFactorLoading: false,

        twoFactorSetup: null,
        twoFactorError: null,

        // Refresh user state if backend returns user
        user: action.payload?.user || state.user,
      };

    case TWO_FACTOR_VERIFY_FAIL:
      return {
        ...state,
        twoFactorLoading: false,

        twoFactorError: action.payload,
      };

    // --------------------------------------------------
    // 2FA DISABLE
    // --------------------------------------------------

    case TWO_FACTOR_DISABLE_REQUEST:
      return {
        ...state,
        twoFactorLoading: true,
        twoFactorError: null,
      };

    case TWO_FACTOR_DISABLE_SUCCESS:
      return {
        ...state,
        twoFactorLoading: false,

        twoFactorError: null,

        user: action.payload?.user || state.user,
      };

    case TWO_FACTOR_DISABLE_FAIL:
      return {
        ...state,
        twoFactorLoading: false,

        twoFactorError: action.payload,
      };

    // --------------------------------------------------
    // CLEAR ERRORS
    // --------------------------------------------------

    case CLEAR_2FA_ERROR:
      return {
        ...state,
        twoFactorError: null,
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

// ==========================================================
// PROFILE REDUCER
// ==========================================================

export const profileReducer = (state = {}, action) => {
  switch (action.type) {
    case UPDATE_PROFILE_REQUEST:
    case UPDATE_PASSWORD_REQUEST:
    case UPDATE_USER_REQUEST:
    case DELETE_USER_REQUEST:
      return {
        ...state,
        loading: true,
      };

    case UPDATE_PROFILE_SUCCESS:
    case UPDATE_PASSWORD_SUCCESS:
    case UPDATE_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        isUpdated: action.payload,
      };

    case DELETE_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        isDeleted: action.payload.success,
        message: action.payload.message,
      };

    case UPDATE_PROFILE_FAIL:
    case UPDATE_PASSWORD_FAIL:
    case UPDATE_USER_FAIL:
    case DELETE_USER_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case UPDATE_PROFILE_RESET:
    case UPDATE_PASSWORD_RESET:
    case UPDATE_USER_RESET:
      return {
        ...state,
        isUpdated: false,
      };

    case DELETE_USER_RESET:
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

// ==========================================================
// FORGOT PASSWORD REDUCER
// ==========================================================

export const forgotPasswordReducer = (state = {}, action) => {
  switch (action.type) {
    case FORGOT_PASSWORD_REQUEST:
    case RESET_PASSWORD_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FORGOT_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        message: action.payload,
      };

    case RESET_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        success: action.payload,
      };

    case FORGOT_PASSWORD_FAIL:
    case RESET_PASSWORD_FAIL:
      return {
        ...state,
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

// ==========================================================
// ALL USERS REDUCER
// ==========================================================

export const allUsersReducer = (state = { users: [] }, action) => {
  switch (action.type) {
    case ALL_USERS_REQUEST:
      return {
        ...state,
        loading: true,
      };

    case ALL_USERS_SUCCESS:
      return {
        ...state,
        loading: false,
        users: action.payload,
      };

    case ALL_USERS_FAIL:
      return {
        ...state,
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

// ==========================================================
// USER DETAILS REDUCER
// ==========================================================

export const userDetailsReducer = (state = { user: {} }, action) => {
  switch (action.type) {
    case USER_DETAILS_REQUEST:
      return {
        ...state,
        loading: true,
      };

    case USER_DETAILS_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload,
      };

    case USER_DETAILS_FAIL:
      return {
        ...state,
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

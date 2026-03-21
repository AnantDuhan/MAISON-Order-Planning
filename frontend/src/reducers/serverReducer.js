import {
  SERVER_WAKEUP_REQUEST,
  SERVER_WAKEUP_SUCCESS,
  SERVER_WAKEUP_FAIL,
} from "../constants/serverConstants";
export const serverReducer = (state = { isAwake: false, loading: false }, action) => {
  switch (action.type) {
    case SERVER_WAKEUP_REQUEST:
      return { 
        ...state, 
        loading: true 
    };

    case SERVER_WAKEUP_SUCCESS:
      return { 
        loading: false, 
        isAwake: true 
    };

    case SERVER_WAKEUP_FAIL:
      return { 
        loading: false, 
        isAwake: false, 
        error: action.payload 
    };

    default:
      return state;
  }
};
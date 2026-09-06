import axios from "axios";
import {
  SERVER_WAKEUP_REQUEST,
  SERVER_WAKEUP_SUCCESS,
  SERVER_WAKEUP_FAIL,
} from "../constants/serverConstants";

export const wakeUpServer = () => async (dispatch) => {
  try {
    dispatch({ type: SERVER_WAKEUP_REQUEST });

    const check = async () => {
      try {
        // const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/v1/health`);
        const res = await axios.get(`http://localhost:4000/api/v1/health`);
        console.log("✅ Server Responded:", res.data);
        dispatch({ type: SERVER_WAKEUP_SUCCESS });
      } catch (err) {
        setTimeout(check, 3000);
      }
    };

    check();
  } catch (error) {
    dispatch({
      type: SERVER_WAKEUP_FAIL,
      payload: error.message,
    });
  }
};
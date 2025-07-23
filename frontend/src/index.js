import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Bounce, toast, ToastContainer } from 'react-toastify';

import App from './App';
import store from './store';

import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter } from 'react-router-dom';

const options = {
    autoClose:  3000,
    position: toast.POSITION.BOTTOM_CENTER,
    transition: Bounce,
};

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
        <Provider store={store}>
            <App />
        </Provider>
    </BrowserRouter>
    <ToastContainer {...options} />
  </React.StrictMode>,
  document.getElementById('root')
);

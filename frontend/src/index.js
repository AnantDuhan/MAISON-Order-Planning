import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Bounce, toast, ToastContainer } from 'react-toastify';

import App from './App';
import store from './store';

import 'react-toastify/dist/ReactToastify.css';

const toastOptions = {
    autoClose: 3000,
    position: toast.POSITION.BOTTOM_CENTER,
    transition: Bounce,
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <Provider store={store}>
          <App />
        </Provider>
      </BrowserRouter>
      <ToastContainer {...toastOptions} />
    </HelmetProvider>
  </React.StrictMode>
);
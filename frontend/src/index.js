import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Bounce, toast, ToastContainer } from 'react-toastify';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import store from './store';
import { ThemeProvider } from './context/ThemeContext';

import './styles/theme.css';
import 'react-toastify/dist/ReactToastify.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

console.log("Google Client ID Status:", GOOGLE_CLIENT_ID ? "Loaded" : "MISSING");

const toastOptions = {
    autoClose: 3000,
    position: toast.POSITION.BOTTOM_CENTER,
    transition: Bounce,
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}> 
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Provider store={store}>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </Provider>
        </BrowserRouter>
      </GoogleOAuthProvider>
      <ToastContainer {...toastOptions} />
    </HelmetProvider>
  </React.StrictMode>
);
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import store from './store';
import { ThemeProvider } from './context/ThemeContext';
import { FeatureFlagsProvider } from './context/FeatureFlagsContext';
import MaisonToaster from './components/layout/Toast/MaisonToaster';

import './styles/theme.css';

const GOOGLE_CLIENT_ID = import.meta.env.REACT_APP_GOOGLE_CLIENT_ID;
axios.defaults.baseURL = import.meta.env.REACT_APP_BACKEND_URL || '';
axios.defaults.withCredentials = true;

console.log("Google Client ID Status:", GOOGLE_CLIENT_ID ? "Loaded" : "MISSING");


const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}> 
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Provider store={store}>
            <ThemeProvider>
              <FeatureFlagsProvider>
                <App />
              </FeatureFlagsProvider>
            </ThemeProvider>
          </Provider>
        </BrowserRouter>
      </GoogleOAuthProvider>
      <MaisonToaster />
    </HelmetProvider>
  </React.StrictMode>
);
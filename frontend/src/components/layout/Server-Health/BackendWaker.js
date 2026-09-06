import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { wakeUpServer } from '../../../actions/serverAction';
import './BackendWaker.css';
import logo from '../../../images/Ecommerce-logo.png';

const BackendWaker = ({ children }) => {
  const dispatch = useDispatch();
  const { isAwake } = useSelector(state => state.server);
  const [dots, setDots] = useState('');
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (isDevelopment) {
      return undefined;
    }

    dispatch(wakeUpServer());
    
    const interval = setInterval(() => {
      setDots(prev => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, [dispatch, isDevelopment]);

  if (isDevelopment) {
    return children;
  }

  if (!isAwake) {
    return (
      <div className="waker-overlay">
        <div className="waker-content">
          <div className="logo-placeholder">
            <img src={logo} alt="Ecommerce Logo" className="waker-logo" />
          </div>
          <h1 className="waker-title">Order Planning</h1>
          <p className="waker-status">Waking up cloud services{dots}</p>
          <div className="progress-container">
            <div className="progress-bar"></div>
          </div>
          <p className="waker-note">
            Render's free tier sleeps after 15 mins of inactivity. <br />
            Usually takes 30-50 seconds to boot up.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default BackendWaker;
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { wakeUpServer } from '../../../actions/serverAction';
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
            <div className='fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas px-6 text-center'>
                <img src={logo} alt='Maison' className='h-16 w-16 object-contain opacity-90' />

                <p className='eyebrow mt-8'>Order Planning</p>
                <h1 className='heading-display mt-3 text-display'>Maison</h1>

                <p className='mt-6 font-sans text-sm uppercase tracking-luxe text-ink-soft'>
                    Waking up cloud services{dots}
                </p>

                {/* Indeterminate brass bar */}
                <div className='relative mt-8 h-px w-64 overflow-hidden bg-line'>
                    <div className='absolute inset-y-0 w-1/3 animate-[waker_1.6s_ease-in-out_infinite] bg-brass' />
                </div>

                <p className='mt-10 max-w-sm font-sans text-xs leading-relaxed text-ink-faint'>
                    Render's free tier sleeps after 15 minutes of inactivity.
                    <br />
                    This usually takes 30–50 seconds to boot up.
                </p>

                <style>{`
                    @keyframes waker {
                        0%   { left: -35%; }
                        100% { left: 100%; }
                    }
                `}</style>
            </div>
        );
    }

    return children;
};

export default BackendWaker;

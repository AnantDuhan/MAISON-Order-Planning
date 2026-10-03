import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { loginWithMagicLink } from '../../actions/authAction';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';

/** Landing page for the "Sign in to Maison" button in the login-code email. */
const MagicLinkLogin = () => {
    const { token } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const started = useRef(false); // StrictMode runs effects twice; the link is single-use
    const { error, isAuthenticated, twoFactorRequired, twoFactorToken, twoFactorEnrollmentRequired } = useSelector(
        state => state.user
    );

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        dispatch(loginWithMagicLink(token));
    }, [dispatch, token]);

    useEffect(() => {
        if (isAuthenticated) navigate('/', { replace: true });
        if (twoFactorRequired && twoFactorToken) {
            navigate('/login/2fa', {
                replace: true,
                state: { twoFactorToken, enrollmentRequired: twoFactorEnrollmentRequired },
            });
        }
    }, [isAuthenticated, twoFactorRequired, twoFactorToken, twoFactorEnrollmentRequired, navigate]);

    return (
        <div className='form-shell'>
            <MetaData title='Signing in · Maison' noIndex />
            <div className='form-card text-center'>
                <p className='eyebrow'>Sign In</p>
                {error ? (
                    <>
                        <h1 className='heading-display mt-4 text-3xl'>Link expired</h1>
                        <p className='mt-4 font-sans text-sm text-ink-soft'>{error}</p>
                        <Link to='/login' className='btn-solid mt-8 inline-flex'>
                            Back to Sign In
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className='heading-display mt-4 text-3xl'>Signing you in…</h1>
                        <div className='mt-8 flex justify-center'>
                            <ButtonSpinner />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MagicLinkLogin;

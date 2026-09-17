import React, { Fragment, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import MetaData from '../layout/MetaData';

// Landing page for the link in the verification email:
//   ${FRONTEND_URL}/verify-email/:token
// It calls the backend (GET /api/v1/verify-email/:token) and reports the result.
const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // verifying | success | error
    const [message, setMessage] = useState('Verifying your email…');

    useEffect(() => {
        let active = true;

        const verify = async () => {
            try {
                const { data } = await axios.get(`/api/v1/verify-email/${token}`);
                if (!active) return;
                setStatus('success');
                setMessage(data.message || 'Email verified successfully. You can now log in.');
            } catch (error) {
                if (!active) return;
                setStatus('error');
                setMessage(
                    error.response?.data?.message ||
                    'This verification link is invalid or has expired.'
                );
            }
        };

        verify();
        return () => {
            active = false;
        };
    }, [token]);

    return (
        <Fragment>
            <MetaData title='Verify Email' />
            <div className='min-h-[60vh] flex items-center justify-center px-4'>
                <div className='w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm'>
                    <h1
                        className='mb-4 text-2xl text-ink'
                        style={{ fontFamily: 'Cormorant Garamond, serif' }}
                    >
                        Email Verification
                    </h1>

                    <p className={`mb-6 ${status === 'error' ? 'text-red-600' : 'text-ink'}`}>
                        {message}
                    </p>

                    {status === 'verifying' && (
                        <p className='text-ink-faint text-sm'>Please wait a moment…</p>
                    )}

                    {status === 'success' && (
                        <Link
                            to='/login'
                            className='inline-block rounded-lg bg-ink px-6 py-2 text-surface'
                        >
                            Go to Login
                        </Link>
                    )}

                    {status === 'error' && (
                        <Link
                            to='/login'
                            className='inline-block rounded-lg border border-line px-6 py-2 text-ink'
                        >
                            Back to Login
                        </Link>
                    )}
                </div>
            </div>
        </Fragment>
    );
};

export default VerifyEmail;

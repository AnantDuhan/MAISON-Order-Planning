import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, forgotPassword } from '../../actions/userAction';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';
import { AuthField, inputClass } from './AuthFields';

const ForgotPassword = () => {
    const dispatch = useDispatch();
    const { error, message, loading } = useSelector(state => state.forgotPassword);

    const [email, setEmail] = useState('');
    const [sentTo, setSentTo] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);
    // Only a reply to *this* visit's request switches to "check your inbox";
    // a message left in the store from an earlier visit doesn't.
    const requested = useRef(false);

    const forgotPasswordSubmit = e => {
        e.preventDefault();
        requested.current = true;
        dispatch(forgotPassword({ email: email.trim() }));
        setProgress(50);
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
            requested.current = false;
        }
        if (message && requested.current) {
            setSentTo(email.trim());
            requested.current = false;
        }
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 5000);
        return () => clearTimeout(t);
    }, [dispatch, error, message]);

    return (
        <Fragment>
            <MetaData title='Forgot Password · Maison' noIndex />

            {/* The bar is an overlay on top of the page. Rendering it *instead of*
                the form left the user looking at only a header and footer while
                the SMTP call was in flight. */}
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />

            <div className='form-shell'>
                <div className='form-card'>
                    {sentTo ? (
                        <div aria-live='polite'>
                            <p className='eyebrow'>Check your inbox</p>
                            <h1 className='heading-display mt-2 text-3xl'>Reset link sent</h1>
                            <p className='mt-4 font-sans text-sm leading-relaxed text-ink-soft'>
                                If an account exists for <span className='text-ink'>{sentTo}</span>, you'll get an email with a link to
                                choose a new password. It can take a minute or two; check spam if it doesn't arrive.
                            </p>
                            <button
                                type='button'
                                onClick={() => setSentTo('')}
                                className='btn-outline mt-8 w-full'
                            >
                                Use a different email
                            </button>
                        </div>
                    ) : (
                        <Fragment>
                            <p className='eyebrow'>Recover access</p>
                            <h1 className='heading-display mt-2 text-3xl'>Forgot your password?</h1>
                            <p className='mt-3 font-sans text-sm text-ink-soft'>
                                Enter the email you shop with and we'll send you a link to choose a new one.
                            </p>

                            <form className='mt-8 flex flex-col gap-4' onSubmit={forgotPasswordSubmit}>
                                <AuthField id='forgot-email' label='Email'>
                                    <input
                                        id='forgot-email'
                                        type='email'
                                        name='email'
                                        autoComplete='email'
                                        placeholder='you@example.com'
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className={inputClass}
                                    />
                                </AuthField>
                                <button
                                    type='submit'
                                    disabled={loading}
                                    onClick={() => setProgress(progress + 80)}
                                    className='btn-solid mt-2 w-full disabled:opacity-40'
                                >
                                    {loading ? (
                                        <>
                                            <ButtonSpinner />
                                            Sending…
                                        </>
                                    ) : (
                                        'Send reset link'
                                    )}
                                </button>
                            </form>
                        </Fragment>
                    )}

                    <Link
                        to='/login'
                        className='mt-6 block text-center font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft hover:text-brass'
                    >
                        Back to sign in
                    </Link>
                </div>
            </div>
        </Fragment>
    );
};

export default ForgotPassword;

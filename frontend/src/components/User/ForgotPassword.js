import MailOutlineIcon from '@mui/icons-material/MailOutline';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, forgotPassword } from '../../actions/userAction';
import MetaData from '../layout/MetaData';

const ForgotPassword = () => {
    const dispatch = useDispatch();
    const { error, message, loading } = useSelector(state => state.forgotPassword);

    const [email, setEmail] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const forgotPasswordSubmit = e => {
        e.preventDefault();
        const myForm = new FormData();
        myForm.set('email', email);
        dispatch(forgotPassword(myForm));
        setProgress(50);
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (message) {
            toast.success(message);
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, message]);

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Forgot Password · Maison' />
                    <div className='form-shell'>
                        <div className='form-card'>
                            <p className='eyebrow'>Recover Access</p>
                            <h2 className='heading-display mt-2 text-3xl'>Forgot Password</h2>
                            <p className='mt-3 font-sans text-sm text-ink-soft'>
                                Enter your email and we'll send a reset link.
                            </p>

                            <form className='mt-8 flex flex-col gap-6' onSubmit={forgotPasswordSubmit}>
                                <div className='field-row'>
                                    <MailOutlineIcon />
                                    <input
                                        type='email'
                                        placeholder='Email'
                                        required
                                        name='email'
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <button type='submit' onClick={() => setProgress(progress + 80)} className='btn-solid w-full'>
                                    Send Reset Link
                                </button>
                            </form>

                            <Link
                                to='/login'
                                className='mt-6 block text-center font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft hover:text-brass'
                            >
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ForgotPassword;

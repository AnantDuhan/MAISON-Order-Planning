import MailOutlineIcon from '@material-ui/icons/MailOutline';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, forgotPassword } from '../../actions/userAction';
import MetaData from '../layout/MetaData';

import './ForgotPassword.css';

const ForgotPassword = () => {
    const dispatch = useDispatch();

    const { error, message, loading } = useSelector(
        state => state.forgotPassword
    );

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
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <Fragment>
                    <MetaData title='Forgot Password' />
                    <div className='forgotPasswordContainer'>
                        <div className='forgotPasswordBox'>
                            <h2 className='forgotPasswordHeading'>
                                Forgot Password
                            </h2>

                            <form
                                className='forgotPasswordForm'
                                onSubmit={forgotPasswordSubmit}
                            >
                                <div className='forgotPasswordEmail'>
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

                                <input
                                    type='submit'
                                    value='Send'
                                    className='forgotPasswordBtn'
                                    onClick={() => setProgress(progress + 80)}
                                />
                            </form>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ForgotPassword;

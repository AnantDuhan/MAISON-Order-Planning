import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import React, { Fragment, useEffect, useState } from 'react';
// import Loader from '../layout/Loader/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, resetPassword } from '../../actions/userAction';
import MetaData from '../layout/MetaData';

import './ResetPassword.css';

const ResetPassword = ({ match }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, success, loading } = useSelector(
        state => state.forgotPassword
    );

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const resetPasswordSubmit = e => {
        e.preventDefault();

        const myForm = new FormData();

        myForm.set('password', password);
        myForm.set('confirmPassword', confirmPassword);

        dispatch(resetPassword(match.params.token, myForm));
        setProgress(50);
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }

        if (success) {
            toast.success('Password Updated Successfully');

            navigate('/login');
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, success]);

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
                    <MetaData title='Change Password' />
                    <div className='resetPasswordContainer'>
                        <div className='resetPasswordBox'>
                            <h2 className='resetPasswordHeading'>
                                Update Profile
                            </h2>

                            <form
                                className='resetPasswordForm'
                                onSubmit={resetPasswordSubmit}
                            >
                                <div>
                                    <LockOpenIcon />
                                    <input
                                        type='password'
                                        placeholder='New Password'
                                        required
                                        value={password}
                                        onChange={e =>
                                            setPassword(e.target.value)
                                        }
                                    />
                                </div>
                                <div className='loginPassword'>
                                    <LockIcon />
                                    <input
                                        type='password'
                                        placeholder='Confirm Password'
                                        required
                                        value={confirmPassword}
                                        onChange={e =>
                                            setConfirmPassword(e.target.value)
                                        }
                                    />
                                </div>
                                <input
                                    type='submit'
                                    value='Update'
                                    className='resetPasswordBtn'
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

export default ResetPassword;

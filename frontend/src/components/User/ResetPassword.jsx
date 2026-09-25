import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, resetPassword } from '../../actions/userAction';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';

const ResetPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token } = useParams();

    const { error, success, loading } = useSelector(state => state.forgotPassword);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const resetPasswordSubmit = e => {
        e.preventDefault();
        const myForm = new FormData();
        myForm.set('password', password);
        myForm.set('confirmPassword', confirmPassword);
        dispatch(resetPassword(token, myForm));
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
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <MetaData title='Reset Password · Maison' />
            <div className='form-shell'>
                <div className='form-card'>
                    <p className='eyebrow'>Almost There</p>
                    <h2 className='heading-display mt-2 text-3xl'>New Password</h2>

                    <form className='mt-8 flex flex-col gap-6' onSubmit={resetPasswordSubmit}>
                        <div className='field-row'>
                            <LockOpenIcon />
                            <input
                                type='password'
                                placeholder='New Password'
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <div className='field-row'>
                            <LockIcon />
                            <input
                                type='password'
                                placeholder='Confirm Password'
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type='submit'
                            disabled={loading}
                            onClick={() => setProgress(progress + 80)}
                            className='btn-solid w-full disabled:opacity-40'
                        >
                            {loading ? (
                                <>
                                    <ButtonSpinner />
                                    Updating…
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default ResetPassword;

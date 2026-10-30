import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, updatePassword } from '../../actions/userAction';
import { UPDATE_PASSWORD_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';
import Field from '../layout/Field';

const UpdatePassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, isUpdated, loading } = useSelector(state => state.profile);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const updatePasswordSubmit = e => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("The new passwords don't match");
            return;
        }
        dispatch(updatePassword({ oldPassword, newPassword, confirmPassword }));
        setProgress(50);
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (isUpdated) {
            toast.success('Password changed');
            navigate('/account');
            dispatch({ type: UPDATE_PASSWORD_RESET });
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, isUpdated]);

    return (
        <Fragment>
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <MetaData title='Change Password · Maison' noIndex />
            <div className='form-shell'>
                <div className='form-card'>
                    <p className='eyebrow'>Account security</p>
                    <h1 className='heading-display mt-2 text-3xl'>Change password</h1>

                    <form className='mt-8 flex flex-col gap-6' onSubmit={updatePasswordSubmit}>
                        <Field label='Current password'>
                            <input type='password' required autoComplete='current-password' value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        </Field>
                        <Field label='New password'>
                            <input type='password' required autoComplete='new-password' value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </Field>
                        <Field label='Confirm new password' hint={confirmPassword && newPassword !== confirmPassword ? <span className='text-danger'>Doesn't match</span> : null}>
                            <input type='password' required autoComplete='new-password' value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </Field>
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
                                'Change password'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default UpdatePassword;

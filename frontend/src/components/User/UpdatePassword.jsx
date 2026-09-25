import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, updatePassword } from '../../actions/userAction';
import { UPDATE_PASSWORD_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';

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
        const myForm = new FormData();
        myForm.set('oldPassword', oldPassword);
        myForm.set('newPassword', newPassword);
        myForm.set('confirmPassword', confirmPassword);
        dispatch(updatePassword(myForm));
        setProgress(50);
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (isUpdated) {
            toast.success('Password Updated Successfully');
            navigate('/account');
            dispatch({ type: UPDATE_PASSWORD_RESET });
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, isUpdated]);

    return (
        <Fragment>
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <MetaData title='Change Password · Maison' />
            <div className='form-shell'>
                <div className='form-card'>
                    <p className='eyebrow'>Account Security</p>
                    <h2 className='heading-display mt-2 text-3xl'>Change Password</h2>

                    <form className='mt-8 flex flex-col gap-6' onSubmit={updatePasswordSubmit}>
                        <div className='field-row'>
                            <VpnKeyIcon />
                            <input type='password' placeholder='Old Password' required value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        </div>
                        <div className='field-row'>
                            <LockOpenIcon />
                            <input type='password' placeholder='New Password' required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>
                        <div className='field-row'>
                            <LockIcon />
                            <input type='password' placeholder='Confirm Password' required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
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
                                'Change Password'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default UpdatePassword;

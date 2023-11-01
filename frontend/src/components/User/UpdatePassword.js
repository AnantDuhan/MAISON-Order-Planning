import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, updatePassword } from '../../actions/userAction';
import { UPDATE_PASSWORD_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';

import './UpdatePassword.css';

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
            toast.success('Profile Updated Successfully');

            navigate('/account');

            dispatch({
                type: UPDATE_PASSWORD_RESET
            });
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, isUpdated]);

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
                    <div className='updatePasswordContainer'>
                        <div className='updatePasswordBox'>
                            <h2 className='updatePasswordHeading'>
                                Update Profile
                            </h2>

                            <form
                                className='updatePasswordForm'
                                onSubmit={updatePasswordSubmit}
                            >
                                <div className='loginPassword'>
                                    <VpnKeyIcon />
                                    <input
                                        type='password'
                                        placeholder='Old Password'
                                        required
                                        value={oldPassword}
                                        onChange={e =>
                                            setOldPassword(e.target.value)
                                        }
                                    />
                                </div>

                                <div className='loginPassword'>
                                    <LockOpenIcon />
                                    <input
                                        type='password'
                                        placeholder='New Password'
                                        required
                                        value={newPassword}
                                        onChange={e =>
                                            setNewPassword(e.target.value)
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
                                    value='Change'
                                    className='updatePasswordBtn'
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

export default UpdatePassword;

import FaceIcon from '@material-ui/icons/Face';
import MailOutlineIcon from '@material-ui/icons/MailOutline';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, loadUser, updateProfile } from '../../actions/userAction';
import { UPDATE_PROFILE_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';

import './UpdateProfile.css';

const UpdateProfile = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { user } = useSelector(state => state.user);
    const { error, isUpdated, loading } = useSelector(state => state.profile);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState();
    const [avatarPreview, setAvatarPreview] = useState('/Profile.png');
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const updateProfileSubmit = e => {
        e.preventDefault();

        const myForm = new FormData();

        myForm.set('name', name);
        myForm.set('email', email);
        myForm.set('avatar', avatar);
        dispatch(updateProfile(myForm));
        setProgress(50);
    };

    const updateProfileDataChange = e => {
        const reader = new FileReader();

        reader.onload = () => {
            if (reader.readyState === 2) {
                setAvatarPreview(reader.result);
                setAvatar(reader.result);
            }
        };

        reader.readAsDataURL(e.target.files[0]);
    };

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setAvatarPreview(user.avatar.url);
        }

        if (error) {
            alert.error(error);
            dispatch(clearErrors());
        }

        if (isUpdated) {
            toast.success('Profile Updated Successfully');
            dispatch(loadUser());

            navigate('/account');

            dispatch({
                type: UPDATE_PROFILE_RESET
            });
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, user, isUpdated]);
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
                    <MetaData title='Update Profile' />
                    <div className='updateProfileContainer'>
                        <div className='updateProfileBox'>
                            <h2 className='updateProfileHeading'>
                                Update Profile
                            </h2>

                            <form
                                className='updateProfileForm'
                                encType='multipart/form-data'
                                onSubmit={updateProfileSubmit}
                            >
                                <div className='updateProfileName'>
                                    <FaceIcon />
                                    <input
                                        type='text'
                                        placeholder='Name'
                                        required
                                        name='name'
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div className='updateProfileEmail'>
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

                                <div id='updateProfileImage'>
                                    <img
                                        src={avatarPreview}
                                        alt='Avatar Preview'
                                    />
                                    <input
                                        type='file'
                                        name='avatar'
                                        accept='image/*'
                                        onChange={updateProfileDataChange}
                                    />
                                </div>
                                <input
                                    type='submit'
                                    value='Update'
                                    className='updateProfileBtn'
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

export default UpdateProfile;

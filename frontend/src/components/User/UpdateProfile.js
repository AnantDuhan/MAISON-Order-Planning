import FaceIcon from '@mui/icons-material/Face';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, loadUser, updateProfile } from '../../actions/userAction';
import { UPDATE_PROFILE_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';

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
        if (avatar) {
            myForm.set('image', avatar);
        }
        dispatch(updateProfile(myForm));
        setProgress(50);
    };

    const updateProfileDataChange = e => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.readyState === 2) {
                setAvatarPreview(reader.result);
                setAvatar(e.target.files[0]);
            }
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setAvatarPreview(user.avatar?.url || user.avatar || '/Profile.png');
        }
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (isUpdated) {
            toast.success('Profile Updated Successfully');
            dispatch(loadUser());
            navigate('/account');
            dispatch({ type: UPDATE_PROFILE_RESET });
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, user, isUpdated]);

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Update Profile · Maison' />
                    <div className='form-shell'>
                        <div className='form-card'>
                            <p className='eyebrow'>Your Details</p>
                            <h2 className='heading-display mt-2 text-3xl'>Update Profile</h2>

                            <form className='mt-8 flex flex-col gap-6' encType='multipart/form-data' onSubmit={updateProfileSubmit}>
                                <div className='flex flex-col items-center gap-4'>
                                    <img
                                        src={avatarPreview}
                                        alt='Avatar Preview'
                                        className='h-24 w-24 rounded-full border border-line object-cover'
                                    />
                                    <label className='cursor-pointer font-sans text-[0.72rem] uppercase tracking-luxe text-brass hover:underline'>
                                        Change Photo
                                        <input type='file' name='avatar' accept='image/*' onChange={updateProfileDataChange} className='hidden' />
                                    </label>
                                </div>

                                <div className='field-row'>
                                    <FaceIcon />
                                    <input type='text' placeholder='Name' required name='name' value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className='field-row'>
                                    <MailOutlineIcon />
                                    <input type='email' placeholder='Email' required name='email' value={email} onChange={e => setEmail(e.target.value)} />
                                </div>

                                <button type='submit' onClick={() => setProgress(progress + 80)} className='btn-solid w-full'>
                                    Update
                                </button>
                            </form>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default UpdateProfile;

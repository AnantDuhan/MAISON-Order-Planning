import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, loadUser, updateProfile } from '../../actions/userAction';
import { UPDATE_PROFILE_RESET } from '../../constants/userConstants';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';
import Field from '../layout/Field';

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
            toast.success('Profile updated');
            dispatch(loadUser());
            navigate('/account');
            dispatch({ type: UPDATE_PROFILE_RESET });
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, user, isUpdated]);

    return (
        <Fragment>
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <MetaData title='Edit Profile · Maison' noIndex />
            <div className='form-shell'>
                <div className='form-card'>
                    <p className='eyebrow'>Your Details</p>
                    <h1 className='heading-display mt-2 text-3xl'>Edit profile</h1>

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

                        <Field label='Full name'>
                            <input type='text' required name='name' autoComplete='name' value={name} onChange={e => setName(e.target.value)} />
                        </Field>
                        <Field label='Email'>
                            <input type='email' required name='email' autoComplete='email' value={email} onChange={e => setEmail(e.target.value)} />
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
                                'Save changes'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default UpdateProfile;

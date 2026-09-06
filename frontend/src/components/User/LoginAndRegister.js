import BadgeIcon from '@mui/icons-material/Badge';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import { clearErrors, login, register, loginWithGoogle } from '../../actions/userAction';

const LoginAndRegister = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, loading, isAuthenticated, message, twoFactorRequired, userIdFor2fa } =
        useSelector(state => state.user);

    const [tab, setTab] = useState('login');
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const [user, setUser] = useState({ name: '', email: '', password: '' });
    const { name, email, password } = user;
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    const [avatar, setAvatar] = useState('/Profile.png');
    const [avatarPreview, setAvatarPreview] = useState('/Profile.png');

    const registerSubmit = e => {
        e.preventDefault();
        setProgress(50);
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('email', email);
        myForm.set('password', password);
        myForm.set('avatar', avatar);
        dispatch(register(myForm));
    };

    const handleGoogleLoginSuccess = credentialResponse => {
        setProgress(50);
        dispatch(loginWithGoogle(credentialResponse.credential));
    };

    const handleGoogleLoginError = () => {
        toast.error('Google login failed. Please try again.');
    };

    const loginSubmit = e => {
        e.preventDefault();
        setProgress(50);
        dispatch(login(loginIdentifier, loginPassword));
    };

    const registerDataChange = e => {
        if (e.target.name === 'avatar') {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.readyState === 2) {
                    setAvatarPreview(reader.result);
                    setAvatar(reader.result);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        } else {
            setUser({ ...user, [e.target.name]: e.target.value });
        }
    };

    useEffect(() => {
        setProgress(100);
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (isAuthenticated) {
            navigate('/');
        }
        if (message) {
            toast.success(message);
        }
        if (twoFactorRequired && userIdFor2fa) {
            navigate('/login/2fa', { state: { userId: userIdFor2fa } });
        }
        const timer = setTimeout(() => setProgress(0), 5000);
        return () => clearTimeout(timer);
    }, [dispatch, error, navigate, isAuthenticated, message, twoFactorRequired, userIdFor2fa]);

    const Divider = () => (
        <div className='my-6 flex items-center gap-4'>
            <span className='h-px flex-1 bg-line' />
            <span className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>or</span>
            <span className='h-px flex-1 bg-line' />
        </div>
    );

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
                    <div className='form-shell'>
                        <div className='form-card'>
                            {/* Tab switch */}
                            <div className='relative mb-8 grid grid-cols-2'>
                                {['login', 'register'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`pb-3 font-sans text-[0.72rem] uppercase tracking-luxe transition-colors ${
                                            tab === t ? 'text-ink' : 'text-ink-faint hover:text-ink-soft'
                                        }`}
                                    >
                                        {t === 'login' ? 'Login' : 'Register'}
                                    </button>
                                ))}
                                <span className='absolute bottom-0 h-px w-full bg-line' />
                                <span
                                    className={`absolute bottom-0 h-px w-1/2 bg-brass transition-all duration-500 ease-luxe ${
                                        tab === 'register' ? 'left-1/2' : 'left-0'
                                    }`}
                                />
                            </div>

                            {/* LOGIN */}
                            {tab === 'login' && (
                                <form className='flex flex-col gap-6 animate-fade-in' onSubmit={loginSubmit}>
                                    <div className='field-row'>
                                        <MailOutlineIcon />
                                        <input
                                            type='text'
                                            placeholder='Email or Mobile Number'
                                            required
                                            value={loginIdentifier}
                                            onChange={e => setLoginIdentifier(e.target.value)}
                                        />
                                    </div>
                                    <div className='field-row'>
                                        <LockOpenIcon />
                                        <input
                                            type={showLoginPassword ? 'text' : 'password'}
                                            placeholder='Password'
                                            required
                                            value={loginPassword}
                                            onChange={e => setLoginPassword(e.target.value)}
                                        />
                                        <span className='cursor-pointer text-ink-faint hover:text-ink' onClick={() => setShowLoginPassword(!showLoginPassword)}>
                                            {showLoginPassword ? <VisibilityIcon fontSize='small' /> : <VisibilityOffIcon fontSize='small' />}
                                        </span>
                                    </div>
                                    <Link to='/password/forgot' className='self-end font-sans text-[0.7rem] uppercase tracking-luxe text-ink-soft hover:text-brass'>
                                        Forgot Password?
                                    </Link>
                                    <button type='submit' className='btn-solid w-full'>Login</button>

                                    <Divider />
                                    <div className='flex justify-center'>
                                        <GoogleLogin
                                            onSuccess={handleGoogleLoginSuccess}
                                            onError={handleGoogleLoginError}
                                            useOneTap
                                            theme='outline'
                                            size='large'
                                            width='300'
                                        />
                                    </div>
                                </form>
                            )}

                            {/* REGISTER */}
                            {tab === 'register' && (
                                <form className='flex flex-col gap-6 animate-fade-in' encType='multipart/form-data' onSubmit={registerSubmit}>
                                    <div className='field-row'>
                                        <BadgeIcon />
                                        <input type='text' placeholder='Name' required name='name' value={name} onChange={registerDataChange} />
                                    </div>
                                    <div className='field-row'>
                                        <MailOutlineIcon />
                                        <input type='email' placeholder='Email' required name='email' value={email} onChange={registerDataChange} />
                                    </div>
                                    <div className='field-row'>
                                        <LockOpenIcon />
                                        <input
                                            type={showRegisterPassword ? 'text' : 'password'}
                                            placeholder='Password'
                                            required
                                            name='password'
                                            value={password}
                                            onChange={registerDataChange}
                                        />
                                        <span className='cursor-pointer text-ink-faint hover:text-ink' onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                                            {showRegisterPassword ? <VisibilityIcon fontSize='small' /> : <VisibilityOffIcon fontSize='small' />}
                                        </span>
                                    </div>

                                    <div className='flex items-center gap-4'>
                                        <img src={avatarPreview} alt='Avatar Preview' className='h-14 w-14 rounded-full border border-line object-cover' />
                                        <label className='cursor-pointer font-sans text-[0.72rem] uppercase tracking-luxe text-brass hover:underline'>
                                            Choose Avatar
                                            <input type='file' name='avatar' accept='image/*' onChange={registerDataChange} className='hidden' />
                                        </label>
                                    </div>

                                    <button type='submit' onClick={() => setProgress(progress + 80)} className='btn-solid w-full'>
                                        Register
                                    </button>

                                    <Divider />
                                    <div className='flex justify-center'>
                                        <GoogleLogin
                                            onSuccess={handleGoogleLoginSuccess}
                                            onError={handleGoogleLoginError}
                                            theme='outline'
                                            size='large'
                                            width='300'
                                        />
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </GoogleOAuthProvider>
            )}
        </Fragment>
    );
};

export default LoginAndRegister;

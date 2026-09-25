import BadgeIcon from '@mui/icons-material/Badge';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

import { clearErrors, login, register, loginWithGoogle } from '../../actions/userAction';
import ButtonSpinner from '../layout/ButtonSpinner';
import TryDemoButton from '../layout/TryDemoButton';

const LoginAndRegister = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const {
        error,
        loading,
        isAuthenticated,
        message,
        twoFactorRequired,
        twoFactorToken,
        twoFactorEnrollmentRequired
    } = useSelector(state => state.user);

    const [tab, setTab] = useState('login');
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resendingVerification, setResendingVerification] = useState(false);
    const [verificationEmailMessage, setVerificationEmailMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const [user, setUser] = useState({ name: '', whatsappNumber: '', email: '', password: '' });
    const { name, whatsappNumber, email, password } = user;
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('/Profile.png');

    const registerSubmit = e => {
        e.preventDefault();
        setProgress(50);
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('whatsappNumber', whatsappNumber);
        myForm.set('email', email);
        myForm.set('password', password);
        if (avatarFile) {
            myForm.set('image', avatarFile);
        }
        dispatch(register(myForm));
    };

    const handleGoogleLoginSuccess = credentialResponse => {
        setProgress(50);
        dispatch(loginWithGoogle(credentialResponse.credential));
    };

    const handleGoogleLoginError = () => {
        toast.error('Google login failed. Please try again.');
    };

    const loginSubmit = async e => {
        e.preventDefault();
        setProgress(50);
        setUnverifiedEmail('');
        setVerificationEmailMessage('');

        try {
            const result = await dispatch(login(loginIdentifier, loginPassword));
            if (result?.emailVerificationRequired) {
                setUnverifiedEmail(loginIdentifier.trim());
            }
        } catch {
            // The Redux error state is displayed by the existing login UI.
        }
    };

    const resendVerification = async () => {
        if (!unverifiedEmail) return;

        try {
            setResendingVerification(true);
            setVerificationEmailMessage('');
            const { data } = await axios.post('/api/v1/resend-verification', {
                email: unverifiedEmail,
            });
            setVerificationEmailMessage(data.message || 'A new verification email has been sent.');
        } catch (err) {
            setVerificationEmailMessage(
                err.response?.data?.message || 'Unable to send a verification email. Please try again.'
            );
        } finally {
            setResendingVerification(false);
        }
    };

    const registerDataChange = e => {
        if (e.target.name === 'avatar') {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.readyState === 2) {
                    setAvatarPreview(reader.result);
                }
            };
            setAvatarFile(e.target.files[0]);
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
        if (twoFactorRequired && twoFactorToken) {
            navigate('/login/2fa', {
                state: {
                    twoFactorToken,
                    enrollmentRequired: twoFactorEnrollmentRequired,
                }
            });
        }
        const timer = setTimeout(() => setProgress(0), 5000);
        return () => clearTimeout(timer);
    }, [dispatch, error, navigate, isAuthenticated, message, twoFactorRequired, twoFactorToken, twoFactorEnrollmentRequired]);

    const Divider = () => (
        <div className='my-6 flex items-center gap-4'>
            <span className='h-px flex-1 bg-line' />
            <span className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>or</span>
            <span className='h-px flex-1 bg-line' />
        </div>
    );

    return (
        <Fragment>
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <GoogleOAuthProvider clientId={import.meta.env.REACT_APP_GOOGLE_CLIENT_ID}>
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

                                    {unverifiedEmail && (
                                        <div className='border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900'>
                                            <p>
                                                Please verify your email by checking the inbox for <strong>{unverifiedEmail}</strong> before signing in.
                                            </p>
                                            <button
                                                type='button'
                                                onClick={resendVerification}
                                                disabled={resendingVerification}
                                                className='mt-3 font-sans text-xs font-semibold uppercase tracking-luxe underline disabled:cursor-not-allowed disabled:opacity-60'
                                            >
                                                {resendingVerification ? 'Sending…' : "I didn't receive an email — resend it"}
                                            </button>
                                            {verificationEmailMessage && (
                                                <p className='mt-3 text-xs'>{verificationEmailMessage}</p>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type='submit'
                                        disabled={loading}
                                        className='btn-solid w-full disabled:opacity-40'
                                    >
                                        {loading ? (
                                            <>
                                                <ButtonSpinner />
                                                Signing in…
                                            </>
                                        ) : (
                                            'Login'
                                        )}
                                    </button>

                                    <div className='flex justify-center'>
                                        <TryDemoButton />
                                    </div>

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
                                        <PhoneAndroidIcon />
                                        <input
                                            type='tel'
                                            placeholder='WhatsApp Number'
                                            required
                                            name='whatsappNumber'
                                            value={whatsappNumber}
                                            onChange={registerDataChange}
                                        />
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

                                    <button
                                        type='submit'
                                        disabled={loading}
                                        onClick={() => setProgress(progress + 80)}
                                        className='btn-solid w-full disabled:opacity-40'
                                    >
                                        {loading ? (
                                        <>
                                            <ButtonSpinner />
                                            Creating account…
                                        </>
                                    ) : (
                                        'Register'
                                    )}
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
        </Fragment>
    );
};

export default LoginAndRegister;

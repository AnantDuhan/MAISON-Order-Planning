import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

import RememberMeToggle from './RememberMeToggle';
import { clearErrors, login, register, loginWithGoogle } from '../../actions/userAction';
import { getLoginMethods, loginWithPasskey, passkeysSupported } from '../../actions/authAction';
import PasswordlessLogin from './PasswordlessLogin';
import ButtonSpinner from '../layout/ButtonSpinner';
import TryDemoButton from '../layout/TryDemoButton';
import WaxSealPanel from './WaxSealPanel';
import MetaData from '../layout/MetaData';

const MIN_PASSWORD = 6; // matches the user model

/** A labelled field: the label stays visible above what's typed. */
const Field = ({ id, label, aside, children }) => (
    <div className='border border-line bg-surface px-4 pb-2.5 pt-2.5 transition-colors focus-within:border-ink'>
        <div className='flex items-baseline justify-between gap-3'>
            <label htmlFor={id} className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>{label}</label>
            {aside}
        </div>
        {children}
    </div>
);
const inputClass = 'mt-1 w-full bg-transparent font-sans text-[0.95rem] text-ink placeholder:text-ink-faint/70 focus:outline-none';

const PasswordInput = ({ id, value, onChange, show, onToggle, autoComplete, placeholder, name }) => (
    <div className='flex items-center gap-3'>
        <input
            id={id}
            name={name}
            type={show ? 'text' : 'password'}
            autoComplete={autoComplete}
            placeholder={placeholder}
            required
            value={value}
            onChange={onChange}
            className={inputClass}
        />
        <button
            type='button'
            onClick={onToggle}
            aria-label={show ? 'Hide password' : 'Show password'}
            className='mt-1 shrink-0 text-ink-faint hover:text-ink'
        >
            {show ? <VisibilityIcon fontSize='small' /> : <VisibilityOffIcon fontSize='small' />}
        </button>
    </div>
);

const Divider = ({ label = 'or with email' }) => (
    <div className='my-6 flex items-center gap-4'>
        <span className='h-px flex-1 bg-line' />
        <span className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>{label}</span>
        <span className='h-px flex-1 bg-line' />
    </div>
);

/** Google's button is a fixed-width iframe (200–400px): size it to the column. */
const useColumnWidth = () => {
    const ref = useRef(null);
    const [width, setWidth] = useState(360);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => {
            setWidth(Math.max(200, Math.min(400, Math.floor(entry.contentRect.width))));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return [ref, width];
};

const LoginAndRegister = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const {
        error,
        loading,
        isAuthenticated,
        message,
        twoFactorRequired,
        twoFactorToken,
        twoFactorEnrollmentRequired
    } = useSelector(state => state.user);

    // /login?mode=register opens the sign-up view.
    const [tab, setTab] = useState(() => (new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login'));
    // How to sign in: 'password' | 'email' | 'phone'
    const [method, setMethod] = useState('password');
    const [methods, setMethods] = useState({ phone: false });
    const [canUsePasskey] = useState(() => passkeysSupported());
    const [googleRef, googleWidth] = useColumnWidth();

    useEffect(() => {
        getLoginMethods().then(setMethods);
    }, []);

    const otherMethods = [
        ...(methods.emailCode !== false ? [{ id: 'email', label: 'Email me a code' }] : []),
        ...(methods.phone ? [{ id: 'phone', label: 'Use phone OTP' }] : []),
    ];
    const showPasskey = canUsePasskey && methods.passkey !== false;
    const showGoogle = methods.google !== false;

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

    const switchTo = next => {
        setTab(next);
        setMethod('password');
        window.scrollTo({ top: 0 });
    };

    const registerSubmit = e => {
        e.preventDefault();
        if (password.length < MIN_PASSWORD) {
            toast.error(`Please use at least ${MIN_PASSWORD} characters for your password.`);
            return;
        }
        setProgress(50);
        // Name, email and password. A photo can be added from the profile;
        // the WhatsApp number is optional.
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('email', email);
        myForm.set('password', password);
        if (whatsappNumber.trim()) myForm.set('whatsappNumber', whatsappNumber.trim());
        dispatch(register(myForm));
    };

    const handleGoogleLoginSuccess = credentialResponse => {
        setProgress(50);
        dispatch(loginWithGoogle(credentialResponse.credential));
    };

    const handleGoogleLoginError = () => {
        toast.error('Google sign-in failed. Please try again.');
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
            // The Redux error state is shown as a toast below.
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

    const registerDataChange = e => setUser({ ...user, [e.target.name]: e.target.value });

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

    const googleButton = (text, useOneTap) => showGoogle && (
        <div className='flex justify-center'>
            <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                useOneTap={useOneTap}
                text={text}
                theme='outline'
                size='large'
                shape='rectangular'
                width={String(googleWidth)}
            />
        </div>
    );

    const passkeyButton = showPasskey && (
        <button
            type='button'
            onClick={() => dispatch(loginWithPasskey())}
            disabled={loading}
            className='btn-outline flex min-h-[44px] w-full items-center justify-center gap-2 disabled:opacity-40'
        >
            <FingerprintIcon fontSize='small' />
            Use a passkey
        </button>
    );

    return (
        <Fragment>
            <MetaData title={tab === 'login' ? 'Sign in · Maison' : 'Create an account · Maison'} noIndex />
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <GoogleOAuthProvider clientId={import.meta.env.REACT_APP_GOOGLE_CLIENT_ID}>
                <div className='lg:grid lg:min-h-[calc(100vh-6.5rem)] lg:grid-cols-2'>
                    <WaxSealPanel mode={tab} />

                    <div className='flex justify-center px-6 py-10 sm:py-14 lg:items-center lg:px-12'>
                        <div ref={googleRef} className='w-full max-w-[420px]'>
                            {/* Desktop: switch between the two views */}
                            <div className='relative mb-8 hidden grid-cols-2 lg:grid' role='tablist' aria-label='Account'>
                                {[['login', 'Sign in'], ['register', 'Create account']].map(([id, label]) => (
                                    <button
                                        key={id}
                                        type='button'
                                        role='tab'
                                        aria-selected={tab === id}
                                        onClick={() => switchTo(id)}
                                        className={`pb-3 font-sans text-[0.72rem] uppercase tracking-luxe transition-colors ${tab === id ? 'text-ink' : 'text-ink-faint hover:text-ink-soft'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                                <span className='absolute bottom-0 h-px w-full bg-line' />
                                <span className={`absolute bottom-0 h-px w-1/2 bg-brass transition-all duration-500 ease-luxe ${tab === 'register' ? 'left-1/2' : 'left-0'}`} />
                            </div>

                            {tab === 'login' && (
                                <div className='animate-fade-in'>
                                    <p className='eyebrow'>Welcome back</p>
                                    <h1 className='heading-display mt-2 text-4xl sm:text-5xl'>Sign in</h1>
                                    <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                                        Track orders, check out faster and see your membership.
                                    </p>

                                    {(showGoogle || showPasskey) && (
                                        <div className='mt-7 flex flex-col gap-3'>
                                            {googleButton('signin_with', true)}
                                            {passkeyButton}
                                        </div>
                                    )}

                                    {method === 'password' ? (
                                        <Fragment>
                                            {(showGoogle || showPasskey) && <Divider />}
                                            <form className={`flex flex-col gap-3 ${showGoogle || showPasskey ? '' : 'mt-7'}`} onSubmit={loginSubmit}>
                                                <Field id='login-email' label='Email'>
                                                    <input
                                                        id='login-email'
                                                        type='email'
                                                        autoComplete='username webauthn'
                                                        placeholder='you@example.com'
                                                        required
                                                        value={loginIdentifier}
                                                        onChange={e => setLoginIdentifier(e.target.value)}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                                <Field
                                                    id='login-password'
                                                    label='Password'
                                                    aside={<Link to='/password/forgot' className='font-sans text-xs text-brass hover:underline'>Forgot?</Link>}
                                                >
                                                    <PasswordInput
                                                        id='login-password'
                                                        autoComplete='current-password'
                                                        value={loginPassword}
                                                        onChange={e => setLoginPassword(e.target.value)}
                                                        show={showLoginPassword}
                                                        onToggle={() => setShowLoginPassword(v => !v)}
                                                    />
                                                </Field>

                                                <RememberMeToggle className='mt-1' />

                                                {unverifiedEmail && (
                                                    <div className='border border-brass/40 bg-brass/5 p-4 font-sans text-sm text-ink'>
                                                        <p>
                                                            Please verify your email by checking the inbox for <strong>{unverifiedEmail}</strong> before signing in.
                                                        </p>
                                                        <button
                                                            type='button'
                                                            onClick={resendVerification}
                                                            disabled={resendingVerification}
                                                            className='mt-3 font-sans text-xs font-semibold uppercase tracking-luxe text-brass underline disabled:cursor-not-allowed disabled:opacity-60'
                                                        >
                                                            {resendingVerification ? 'Sending…' : "I didn't receive an email — resend it"}
                                                        </button>
                                                        {verificationEmailMessage && (
                                                            <p className='mt-3 text-xs'>{verificationEmailMessage}</p>
                                                        )}
                                                    </div>
                                                )}

                                                <button type='submit' disabled={loading} className='btn-solid mt-2 h-[52px] w-full py-0 disabled:opacity-40'>
                                                    {loading ? (<><ButtonSpinner />Signing in…</>) : 'Sign in'}
                                                </button>
                                            </form>

                                            {otherMethods.length > 0 && (
                                                <div className='mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2'>
                                                    {otherMethods.map(m => (
                                                        <button
                                                            key={m.id}
                                                            type='button'
                                                            onClick={() => setMethod(m.id)}
                                                            className='font-sans text-sm text-ink underline underline-offset-4 hover:text-brass'
                                                        >
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </Fragment>
                                    ) : (
                                        <div className='mt-7'>
                                            <PasswordlessLogin key={method} channel={method} />
                                            <RememberMeToggle className='mt-4' />
                                            <button
                                                type='button'
                                                onClick={() => setMethod('password')}
                                                className='mt-5 font-sans text-sm text-ink underline underline-offset-4 hover:text-brass'
                                            >
                                                ← Use your password instead
                                            </button>
                                        </div>
                                    )}

                                    <p className='mt-8 border-t border-line pt-6 text-center font-sans text-sm text-ink-soft'>
                                        New to Maison?{' '}
                                        <button type='button' onClick={() => switchTo('register')} className='font-medium text-brass hover:underline'>
                                            Create an account
                                        </button>
                                    </p>
                                    <div className='mt-6'>
                                        <p className='mb-2 text-center font-sans text-xs text-ink-faint'>Just looking? Explore the shop and admin with demo data.</p>
                                        <TryDemoButton />
                                    </div>
                                </div>
                            )}

                            {tab === 'register' && (
                                <div className='animate-fade-in'>
                                    <p className='eyebrow'>New to Maison</p>
                                    <h1 className='heading-display mt-2 text-4xl sm:text-5xl'>Create your account</h1>
                                    <ul className='mt-4 flex flex-wrap gap-2 lg:hidden'>
                                        {['Track every order', 'Saved addresses', 'Wishlist'].map(p => (
                                            <li key={p} className='border border-line bg-surface px-2.5 py-1 font-sans text-xs text-ink-soft'>{p}</li>
                                        ))}
                                    </ul>

                                    {showGoogle && <div className='mt-7'>{googleButton('signup_with', false)}</div>}
                                    {showGoogle && <Divider />}

                                    <form className={`flex flex-col gap-3 ${showGoogle ? '' : 'mt-7'}`} onSubmit={registerSubmit}>
                                        <Field id='reg-name' label='Full name'>
                                            <input id='reg-name' type='text' name='name' autoComplete='name' placeholder='Priya Sharma' required value={name} onChange={registerDataChange} className={inputClass} />
                                        </Field>
                                        <Field id='reg-email' label='Email'>
                                            <input id='reg-email' type='email' name='email' autoComplete='email' placeholder='you@example.com' required value={email} onChange={registerDataChange} className={inputClass} />
                                        </Field>
                                        <Field id='reg-password' label='Password'>
                                            <PasswordInput
                                                id='reg-password'
                                                name='password'
                                                autoComplete='new-password'
                                                placeholder={`At least ${MIN_PASSWORD} characters`}
                                                value={password}
                                                onChange={registerDataChange}
                                                show={showRegisterPassword}
                                                onToggle={() => setShowRegisterPassword(v => !v)}
                                            />
                                        </Field>
                                        <Field id='reg-phone' label={<>WhatsApp number <span className='normal-case tracking-normal'>(optional)</span></>}>
                                            <input id='reg-phone' type='tel' inputMode='tel' name='whatsappNumber' autoComplete='tel' placeholder='For order updates, e.g. 98765 43210' value={whatsappNumber} onChange={registerDataChange} className={inputClass} />
                                        </Field>

                                        <button
                                            type='submit'
                                            disabled={loading}
                                            className='btn-solid mt-2 h-[52px] w-full py-0 disabled:opacity-40'
                                        >
                                            {loading ? (<><ButtonSpinner />Creating account…</>) : 'Create account'}
                                        </button>
                                        <p className='font-sans text-xs leading-relaxed text-ink-faint'>
                                            By creating an account you agree to the{' '}
                                            <Link to='/terms' className='text-ink-soft underline'>Terms</Link> and{' '}
                                            <Link to='/privacy' className='text-ink-soft underline'>Privacy Policy</Link>.
                                        </p>
                                    </form>

                                    <p className='mt-8 border-t border-line pt-6 text-center font-sans text-sm text-ink-soft'>
                                        Already have an account?{' '}
                                        <button type='button' onClick={() => switchTo('login')} className='font-medium text-brass hover:underline'>
                                            Sign in
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </GoogleOAuthProvider>
        </Fragment>
    );
};

export default LoginAndRegister;

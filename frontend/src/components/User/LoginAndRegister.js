import BadgeIcon from '@mui/icons-material/Badge';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneIcon from '@mui/icons-material/Phone';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, login, register, loginWithGoogle, sendOtp, loginWithOtp,} from '../../actions/userAction';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

import './LoginAndRegister.css';

const LoginAndRegister = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, loading, isAuthenticated, message, twoFactorRequired, userIdFor2fa } = useSelector(
        state => state.user
    );

    const loginTab = useRef(null);
    const registerTab = useRef(null);
    const switcherTab = useRef(null);
    // const loadingBar = useRef(null);

    const [loginMode, setLoginMode] = useState('password');
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resendTimer, setResendTimer] = useState(0);

    const [otpStep, setOtpStep] = useState(1); // 1 for number input, 2 for OTP input
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [otp, setOtp] = useState('');

    const onLoaderFinished = () => setProgress(0);

    const [user, setUser] = useState({
        name: '',
        email: '',
        password: ''
    });

    const { name, email, password } = user;
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    const [avatar, setAvatar] = useState('/Profile.png');
    const [avatarPreview, setAvatarPreview] = useState('/Profile.png');

    const handleResendOtp = () => {
        if (resendTimer > 0) return;
        setProgress(50);
        dispatch(sendOtp(loginIdentifier));
    };

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
        const idToken = credentialResponse.credential;
        dispatch(loginWithGoogle(idToken));
    };

    const handleGoogleLoginError = () => {
        toast.error('Google login failed. Please try again.');
    };

    const loginSubmit = e => {
        e.preventDefault();
        setProgress(50);
        if (loginMode === 'password') {
            dispatch(login(loginIdentifier, loginPassword));
        } else if (loginMode === 'otp') {
            if (otpStep === 1) {
                if (whatsappNumber.length < 10) {
                    toast.error("Please enter a valid 10-digit number.");
                    return;
                }
                dispatch(sendOtp(loginIdentifier));
                // Do not clear the identifier here
            } else {
                dispatch(loginWithOtp(loginIdentifier, otp));
            }
        }
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
            setOtpStep(2);
            setResendTimer(30);
        }

        if (twoFactorRequired && userIdFor2fa) {
            navigate('/login/2fa', { state: { userId: userIdFor2fa } });
        }

        const timer = setTimeout(() => {
            setProgress(0);
        }, 5000);

        return () => {
            clearTimeout(timer);
        };

    }, [dispatch, error, navigate, isAuthenticated, setProgress, message, twoFactorRequired, userIdFor2fa]);

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const switchTabs = (e, tab) => {
        if (tab === 'login') {
            switcherTab.current.classList.add('shiftToNeutral');
            switcherTab.current.classList.remove('shiftToRight');

            registerTab.current.classList.remove('shiftToNeutralForm');
            loginTab.current.classList.remove('shiftToLeft');
        }
        if (tab === 'register') {
            switcherTab.current.classList.add('shiftToRight');
            switcherTab.current.classList.remove('shiftToNeutral');

            registerTab.current.classList.add('shiftToNeutralForm');
            loginTab.current.classList.add('shiftToLeft');
        }
    };

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
                    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
                        <div className='LoginSignUpContainer'>
                            <div className='LoginSignUpBox'>
                                <div>
                                    <div className='login_signUp_toggle'>
                                        <div className='login_signUp_toggle'>
                                            <p onClick={e => switchTabs(e, 'login')}>LOGIN</p>
                                            <p onClick={e => switchTabs(e, 'register')}>REGISTER</p>
                                        </div>
                                    </div>
                                    <button ref={switcherTab}></button>
                                </div>
                                <form
                                    className='loginForm'
                                    ref={loginTab}
                                    onSubmit={loginSubmit}
                                >
                                    <div className='loginEmail'>
                                        {loginMode === 'password' ? <MailOutlineIcon /> : <PhoneIcon />}
                                        <input
                                            type="text"
                                            placeholder="Email or Mobile Number"
                                            required
                                            value={loginIdentifier}
                                            onChange={e => setLoginIdentifier(e.target.value)}
                                            disabled={loginMode === 'otp' && otpStep === 2} // Disable input when waiting for OTP

                                        />
                                    </div>

                                    {/* --- Conditional Password Field --- */}
                                    {loginMode === 'password' && (
                                        <div className='loginPassword'>
                                            <LockOpenIcon />
                                            <input
                                                type={showLoginPassword ? 'text' : 'password'}
                                                placeholder='Password'
                                                required
                                                value={loginPassword}
                                                onChange={e => setLoginPassword(e.target.value)}
                                            />
                                            <span className='password-icon' onClick={() => setShowLoginPassword(!showLoginPassword)}>
                                                {showLoginPassword ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                            </span>
                                        </div>
                                    )}
            
                                    {/* --- Conditional OTP Field --- */}
                                    {loginMode === 'otp' && otpStep === 2 && (
                                        <div className='loginPassword'> {/* Reusing class for styling */}
                                            <VpnKeyIcon />
                                            <input
                                                type="number"
                                                placeholder="Enter OTP"
                                                required
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <Link to='/password/forgot'>
                                        Forget Password ?
                                    </Link>
                                    {/* --- Conditional Submit Buttons --- */}
                                    {loginMode === 'password' ? (
                                        <input type='submit' value='Login' className='loginBtn' />
                                    ) : (
                                        <input 
                                            type='submit' 
                                            value={otpStep === 1 ? 'Send OTP' : 'Verify & Login'} 
                                            className='loginBtn' 
                                        />
                                    )}

                                    {/* --- Toggle between Login Modes --- */}
                                    <p className="login-mode-toggle" onClick={() => {
                                        setLoginMode(loginMode === 'password' ? 'otp' : 'password');
                                        setOtpStep(1); // Reset OTP step when toggling
                                    }}>
                                        {loginMode === 'password' ? 'Login with OTP' : 'Login with Password'}
                                    </p>


                                    <div className="or-divider">
                                        <span className="or-divider-line"></span>
                                        <span className="or-divider-text">OR</span>
                                        <span className="or-divider-line"></span>
                                    </div>
                                    <input type='submit' value={loginMode === 'password' ? 'Login' : (otpStep === 1 ? 'Send OTP' : 'Verify & Login')} className='loginBtn' />

                                    {/* --- Resend OTP Section --- */}
                                    {loginMode === 'otp' && otpStep === 2 && (
                                        <div className="resend-otp-container">
                                            {resendTimer > 0 ? (
                                                <p>Resend OTP in {resendTimer}s</p>
                                            ) : (
                                                <p className="resend-otp-button" onClick={handleResendOtp}>Resend OTP</p>
                                            )}
                                        </div>
                                    )}
                                    {/* <div className="social-login-header">
                                        <img 
                                            src="https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/googleLogo.png" 
                                            alt="Google logo" 
                                            className="google-logo-icon" 
                                        />
                                        <p className="social-login-text">SignIn with Google</p>
                                    </div> */}
                                    <div className="google-login-button-container">
                                        <GoogleLogin
                                            onSuccess={handleGoogleLoginSuccess}
                                            onError={handleGoogleLoginError}
                                            useOneTap
                                            theme="outline"
                                            size="large"
                                            width="280px"
                                        />
                                    </div>
                                </form>
                                <form
                                    className='signUpForm'
                                    ref={registerTab}
                                    encType='multipart/form-data'
                                    onSubmit={registerSubmit}
                                >
                                    <div className='signUpName'>
                                        <BadgeIcon />
                                        <input
                                            type='text'
                                            placeholder='Name'
                                            required
                                            name='name'
                                            value={name}
                                            onChange={registerDataChange}
                                        />
                                    </div>
                                    <div className='signUpEmail'>
                                        <MailOutlineIcon />
                                        <input
                                            type='email'
                                            placeholder='Email'
                                            required
                                            name='email'
                                            value={email}
                                            onChange={registerDataChange}
                                        />
                                    </div>
                                    <div className='signUpPassword'>
                                        <LockOpenIcon />
                                        <input
                                            type={
                                                showRegisterPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            placeholder='Password'
                                            required
                                            name='password'
                                            value={password}
                                            onChange={registerDataChange}
                                        />
                                        <span
                                            className='password-icon'
                                            onClick={() =>
                                                setShowRegisterPassword(
                                                    !showRegisterPassword
                                                )
                                            }
                                        >
                                            {showRegisterPassword ? (
                                                <VisibilityIcon />
                                            ) : (
                                                <VisibilityOffIcon />
                                            )}
                                        </span>
                                    </div>

                                    <div id='registerImage'>
                                        <img
                                            src={avatarPreview}
                                            alt='Avatar Preview'
                                        />
                                        <input
                                            type='file'
                                            name='avatar'
                                            accept='image/*'
                                            onChange={registerDataChange}
                                        />
                                    </div>
                                    <input
                                        type='submit'
                                        value='Register'
                                        className='signUpBtn'
                                        onClick={() => setProgress(progress + 80)}
                                    />
                                    <div className="or-divider">
                                        <span className="or-divider-line"></span>
                                        <span className="or-divider-text">OR</span>
                                        <span className="or-divider-line"></span>
                                    </div>
                                    {/* <div className="social-login-header">
                                        <img 
                                            src="https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/googleLogo.png" 
                                            alt="Google logo" 
                                            className="google-logo-icon" 
                                        />
                                        <p className="social-login-text">SignUp with Google</p>
                                    </div> */}
                                    <div className="google-login-button-container">
                                        <GoogleLogin
                                            onSuccess={handleGoogleLoginSuccess}
                                            onError={handleGoogleLoginError}
                                            useOneTap
                                            theme="outline"
                                            size="large"
                                            width="280px"
                                        />
                                    </div>
                                </form>
                            </div>
                        </div>
                    </GoogleOAuthProvider>
                </Fragment>
            )}
        </Fragment>
    );
};

export default LoginAndRegister;

import BadgeIcon from '@mui/icons-material/Badge';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import MailOutlineIcon from '@material-ui/icons/MailOutline';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, login, register } from '../../actions/userAction';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import './LoginAndRegister.css';

const LoginAndRegister = ({ history, location }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, loading, isAuthenticated } = useSelector(
        state => state.user
    );

    const loginTab = useRef(null);
    const registerTab = useRef(null);
    const switcherTab = useRef(null);
    // const loadingBar = useRef(null);

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [progress, setProgress] = useState(0);

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

    const loginSubmit = e => {
        e.preventDefault();
        setProgress(50);
        dispatch(login(loginEmail, loginPassword));
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
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }

        if (isAuthenticated) {
            navigate('/');
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, navigate, isAuthenticated]);

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
                    <div className='LoginSignUpContainer'>
                        <div className='LoginSignUpBox'>
                            <div>
                                <div className='login_signUp_toggle'>
                                    <p onClick={e => switchTabs(e, 'login')}>
                                        LOGIN
                                    </p>
                                    <p onClick={e => switchTabs(e, 'register')}>
                                        REGISTER
                                    </p>
                                </div>
                                <button ref={switcherTab}></button>
                            </div>
                            <form
                                className='loginForm'
                                ref={loginTab}
                                onSubmit={loginSubmit}
                            >
                                <div className='loginEmail'>
                                    <MailOutlineIcon />
                                    <input
                                        type='email'
                                        placeholder='Email'
                                        required
                                        value={loginEmail}
                                        onChange={e =>
                                            setLoginEmail(e.target.value)
                                        }
                                    />
                                </div>
                                <div className='loginPassword'>
                                    <LockOpenIcon />
                                    <input
                                        type={
                                            showLoginPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        placeholder='Password'
                                        required
                                        value={loginPassword}
                                        onChange={e =>
                                            setLoginPassword(e.target.value)
                                        }
                                    />
                                    <span
                                        className='password-icon'
                                        onClick={() =>
                                            setShowLoginPassword(
                                                !showLoginPassword
                                            )
                                        }
                                    >
                                        {showLoginPassword ? (
                                            <VisibilityIcon />
                                        ) : (
                                            <VisibilityOffIcon />
                                        )}
                                    </span>
                                </div>
                                <Link to='/password/forgot'>
                                    Forget Password ?
                                </Link>
                                <input
                                    type='submit'
                                    value='Login'
                                    className='loginBtn'
                                    onClick={() => setProgress(progress + 50)}
                                />
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
                            </form>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default LoginAndRegister;

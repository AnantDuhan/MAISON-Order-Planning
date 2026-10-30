import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, resetPassword } from '../../actions/userAction';
import MetaData from '../layout/MetaData';
import ButtonSpinner from '../layout/ButtonSpinner';
import { AuthField, MIN_PASSWORD, PasswordInput } from './AuthFields';

const ResetPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { token } = useParams();

    const { error, success, loading } = useSelector(state => state.forgotPassword);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

    const resetPasswordSubmit = e => {
        e.preventDefault();
        if (password.length < MIN_PASSWORD) {
            toast.error(`Please use at least ${MIN_PASSWORD} characters.`);
            return;
        }
        if (password !== confirmPassword) {
            toast.error("The passwords don't match.");
            return;
        }
        // Plain object → sent as JSON. FormData would go out as multipart,
        // which express.json() doesn't parse, leaving req.body undefined.
        dispatch(resetPassword(token, { password, confirmPassword }));
        setProgress(50);
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (success) {
            toast.success('Password changed. Sign in with your new password.');
            navigate('/login');
        }
        setProgress(100);
        const t = setTimeout(() => setProgress(0), 5000);
        return () => clearTimeout(t);
    }, [dispatch, error, navigate, success]);

    const hint = (show, text) => show && <span className='font-sans text-[0.68rem] text-danger'>{text}</span>;

    return (
        <Fragment>
            <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            <MetaData title='Reset Password · Maison' noIndex />
            <div className='form-shell'>
                <div className='form-card'>
                    <p className='eyebrow'>Almost there</p>
                    <h1 className='heading-display mt-2 text-3xl'>Choose a new password</h1>
                    <p className='mt-3 font-sans text-sm text-ink-soft'>
                        Use at least {MIN_PASSWORD} characters. You'll sign in with it next time.
                    </p>

                    <form className='mt-8 flex flex-col gap-4' onSubmit={resetPasswordSubmit}>
                        <AuthField id='reset-password' label='New password' aside={hint(tooShort, `At least ${MIN_PASSWORD} characters`)}>
                            <PasswordInput
                                id='reset-password'
                                name='password'
                                autoComplete='new-password'
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                show={showPassword}
                                onToggle={() => setShowPassword(v => !v)}
                            />
                        </AuthField>
                        <AuthField id='reset-confirm' label='Confirm new password' aside={hint(mismatch, "Doesn't match")}>
                            <PasswordInput
                                id='reset-confirm'
                                name='confirmPassword'
                                autoComplete='new-password'
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                show={showPassword}
                                onToggle={() => setShowPassword(v => !v)}
                            />
                        </AuthField>
                        <button
                            type='submit'
                            disabled={loading}
                            onClick={() => setProgress(progress + 80)}
                            className='btn-solid mt-2 w-full disabled:opacity-40'
                        >
                            {loading ? (
                                <>
                                    <ButtonSpinner />
                                    Saving…
                                </>
                            ) : (
                                'Save new password'
                            )}
                        </button>
                    </form>

                    <Link
                        to='/password/forgot'
                        className='mt-6 block text-center font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft hover:text-brass'
                    >
                        Link expired? Send a new one
                    </Link>
                </div>
            </div>
        </Fragment>
    );
};

export default ResetPassword;

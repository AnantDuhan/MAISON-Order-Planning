import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import PinIcon from '@mui/icons-material/Pin';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { requestLoginCode, verifyLoginCode } from '../../actions/authAction';
import ButtonSpinner from '../layout/ButtonSpinner';

const RESEND_SECONDS = 30;

/** Two-step sign-in with a one-time code sent by email or SMS. */
const PasswordlessLogin = ({ channel }) => {
    const dispatch = useDispatch();
    const { loading } = useSelector(state => state.user);
    const isEmail = channel === 'email';

    const [step, setStep] = useState('identify'); // 'identify' | 'code'
    const [identifier, setIdentifier] = useState('');
    const [code, setCode] = useState('');
    const [sending, setSending] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const codeInput = useRef(null);

    useEffect(() => {
        if (countdown <= 0) return undefined;
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    useEffect(() => {
        if (step === 'code') codeInput.current?.focus();
    }, [step]);

    const send = async e => {
        e?.preventDefault();
        setError('');
        setSending(true);
        const result = await requestLoginCode(channel, identifier.trim());
        setSending(false);
        if (!result.ok) return setError(result.message);
        setNotice(result.message);
        setStep('code');
        setCode('');
        setCountdown(RESEND_SECONDS);
    };

    const verify = async value => {
        const typed = (value ?? code).replace(/\D/g, '');
        if (typed.length !== 6) return;
        setError('');
        await dispatch(verifyLoginCode(channel, identifier.trim(), typed));
    };

    const onCodeChange = e => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(digits);
        if (digits.length === 6) verify(digits); // auto-submit, incl. SMS autofill
    };

    if (step === 'identify') {
        return (
            <form className='flex flex-col gap-6 animate-fade-in' onSubmit={send}>
                <p className='font-sans text-sm leading-relaxed text-ink-soft'>
                    {isEmail
                        ? "We'll email you a 6-digit code and a one-click sign-in link. No password needed."
                        : "We'll text a 6-digit code to the mobile number on your account."}
                </p>
                <div className='field-row'>
                    {isEmail ? <MailOutlineIcon /> : <PhoneAndroidIcon />}
                    <input
                        type={isEmail ? 'email' : 'tel'}
                        inputMode={isEmail ? 'email' : 'tel'}
                        autoComplete={isEmail ? 'email' : 'tel'}
                        placeholder={isEmail ? 'Email' : 'Mobile number (e.g. 98765 43210)'}
                        aria-label={isEmail ? 'Email' : 'Mobile number'}
                        required
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                    />
                </div>
                {error && (
                    <p role='alert' className='font-sans text-sm text-danger'>
                        {error}
                    </p>
                )}
                <button type='submit' disabled={sending || !identifier.trim()} className='btn-solid w-full disabled:opacity-40'>
                    {sending ? (
                        <>
                            <ButtonSpinner />
                            Sending…
                        </>
                    ) : (
                        'Send Code'
                    )}
                </button>
            </form>
        );
    }

    return (
        <form
            className='flex flex-col gap-6 animate-fade-in'
            onSubmit={e => {
                e.preventDefault();
                verify();
            }}
        >
            <p className='font-sans text-sm leading-relaxed text-ink-soft'>
                {notice}{' '}
                {isEmail && 'You can also just tap the link in the email.'}
            </p>
            <div className='field-row'>
                <PinIcon />
                <input
                    ref={codeInput}
                    type='text'
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    pattern='[0-9]{6}'
                    maxLength={6}
                    placeholder='6-digit code'
                    aria-label='6-digit code'
                    className='tracking-[0.4em]'
                    value={code}
                    onChange={onCodeChange}
                />
            </div>
            <button type='submit' disabled={loading || code.length !== 6} className='btn-solid w-full disabled:opacity-40'>
                {loading ? (
                    <>
                        <ButtonSpinner />
                        Verifying…
                    </>
                ) : (
                    'Sign In'
                )}
            </button>
            <div className='flex items-center justify-between font-sans text-[0.7rem] uppercase tracking-luxe'>
                <button type='button' className='text-ink-soft hover:text-brass' onClick={() => setStep('identify')}>
                    {isEmail ? 'Change email' : 'Change number'}
                </button>
                <button
                    type='button'
                    disabled={countdown > 0 || sending}
                    className='text-ink-soft hover:text-brass disabled:cursor-not-allowed disabled:opacity-50'
                    onClick={send}
                >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
            </div>
        </form>
    );
};

export default PasswordlessLogin;

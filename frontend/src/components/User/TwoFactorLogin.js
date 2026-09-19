import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { enrollAdminTwoFactor, verifyLoginOtp } from '../../actions/userAction';

const TwoFactorLogin = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const twoFactorToken =
        location.state?.twoFactorToken;
    const enrollmentRequired = location.state?.enrollmentRequired === true;

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [setup, setSetup] = useState(null);

    useEffect(() => {
        if (!enrollmentRequired || !twoFactorToken) return;

        let active = true;
        const startEnrollment = async () => {
            try {
                const { data } = await axios.post('/api/v1/login/2fa/setup', {
                    twoFactorToken,
                });
                if (active) setSetup(data);
            } catch (err) {
                if (active) {
                    setError(err.response?.data?.message || 'Unable to start admin 2FA setup.');
                }
            }
        };

        startEnrollment();
        return () => { active = false; };
    }, [enrollmentRequired, twoFactorToken]);

    const handleSubmit = async e => {
        e.preventDefault();

        if (!/^\d{6}$/.test(code)) {
            setError('Enter a valid 6-digit authentication code.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await dispatch(enrollmentRequired
                ? enrollAdminTwoFactor(twoFactorToken, code)
                : verifyLoginOtp(twoFactorToken, code)
            );

            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!twoFactorToken) {
        return (
            <div className="editorial-shell py-20 text-center">
                <p className="text-ink-soft">
                    Your login session is invalid or expired.
                </p>
            </div>
        );
    }

    return (
        <div className="editorial-shell flex min-h-[70vh] items-center justify-center py-16">
            <div className="w-full max-w-md border border-line bg-surface p-8">
                <p className="eyebrow">
                    {enrollmentRequired ? 'Admin security setup' : 'Two-factor authentication'}
                </p>

                <h1 className="heading-display mt-3">
                    {enrollmentRequired ? 'Secure your admin account' : 'Verify your identity'}
                </h1>

                <p className="mt-4 text-sm text-ink-soft">
                    {enrollmentRequired
                        ? 'Two-factor authentication is required before an admin can access the dashboard.'
                        : 'Enter the 6-digit code from your authenticator app.'}
                </p>

                {enrollmentRequired && (
                    <div className="mt-6 border border-line bg-surface-2 p-4 text-center">
                        {setup?.qrCode ? (
                            <>
                                <img
                                    src={setup.qrCode}
                                    alt="Admin 2FA setup QR code"
                                    className="mx-auto h-48 w-48 bg-white p-2"
                                />
                                <p className="mt-3 text-sm text-ink-soft">
                                    Scan this code with an authenticator app, then enter its current code below.
                                </p>
                                <p className="mt-3 break-all font-mono text-xs text-ink-soft">
                                    {setup.secret}
                                </p>
                            </>
                        ) : !error && (
                            <p className="text-sm text-ink-soft">Preparing secure setup…</p>
                        )}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-8"
                >
                    <label
                        htmlFor="twoFactorCode"
                        className="block text-sm font-medium text-ink"
                    >
                        {enrollmentRequired ? 'Enter the 6-digit setup code' : 'Authentication code'}
                    </label>

                    <input
                        id="twoFactorCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={e =>
                            setCode(
                                e.target.value
                                    .replace(/\D/g, '')
                            )
                        }
                        className="mt-2 w-full border border-line bg-surface-2 px-4 py-3 text-center text-xl tracking-[0.4em] text-ink outline-none"
                        autoFocus
                    />

                    {error && (
                        <p className="mt-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className="btn-solid mt-6 w-full"
                    >
                        {loading
                            ? 'Verifying...'
                            : 'Verify code'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="btn-outline mt-3 w-full"
                    >
                        Back to login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TwoFactorLogin;

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { verifyLoginOtp } from '../../actions/userAction';

const TwoFactorLogin = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const twoFactorToken =
        location.state?.twoFactorToken;

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async e => {
        e.preventDefault();

        if (!/^\d{6}$/.test(code)) {
            setError('Enter a valid 6-digit authentication code.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await dispatch(
                verifyLoginOtp(twoFactorToken, code)
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
                    Two-factor authentication
                </p>

                <h1 className="heading-display mt-3">
                    Verify your identity
                </h1>

                <p className="mt-4 text-sm text-ink-soft">
                    Enter the 6-digit code from your
                    authenticator app.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-8"
                >
                    <label
                        htmlFor="twoFactorCode"
                        className="block text-sm font-medium text-ink"
                    >
                        Authentication code
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
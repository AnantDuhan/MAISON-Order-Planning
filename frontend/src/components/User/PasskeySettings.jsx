import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { addPasskey, fetchPasskeys, passkeysSupported, removePasskey } from '../../actions/authAction';
import ButtonSpinner from '../layout/ButtonSpinner';

const formatDate = d =>
    d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Profile → Security: add, list and remove passkeys. */
const PasskeySettings = ({ isDemo = false }) => {
    const [passkeys, setPasskeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const supported = passkeysSupported();

    useEffect(() => {
        fetchPasskeys()
            .then(setPasskeys)
            .catch(() => setPasskeys([]))
            .finally(() => setLoading(false));
    }, []);

    const add = async () => {
        setBusy(true);
        try {
            setPasskeys(await addPasskey());
            toast.success('Passkey added. Next time, sign in with “Sign in with a passkey”.');
        } catch (error) {
            if (error?.name === 'InvalidStateError') toast.info('This device already has a passkey for your account.');
            else if (error?.name !== 'NotAllowedError' && error?.name !== 'AbortError')
                toast.error(error?.response?.data?.message || 'Could not add a passkey.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async pk => {
        if (!window.confirm(`Remove “${pk.name}”? You won't be able to sign in with it any more.`)) return;
        try {
            setPasskeys(await removePasskey(pk.id));
            toast.success('Passkey removed.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not remove the passkey.');
        }
    };

    return (
        <div className='mt-8 border border-line bg-surface p-6'>
            <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                    <p className='eyebrow'>Security</p>
                    <h2 className='mt-2 font-display text-2xl text-ink'>Passkeys</h2>
                    <p className='mt-2 max-w-xl font-sans text-sm leading-6 text-ink-soft'>
                        Sign in with Face ID, your fingerprint or your device PIN instead of a password. Passkeys
                        can't be phished or leaked, and they sync across devices through iCloud Keychain or Google
                        Password Manager.
                    </p>
                </div>
                {supported && !isDemo && (
                    <button type='button' onClick={add} disabled={busy} className='btn-outline shrink-0 disabled:opacity-40'>
                        {busy ? (
                            <>
                                <ButtonSpinner />
                                Waiting…
                            </>
                        ) : (
                            <>
                                <FingerprintIcon fontSize='small' /> Add a passkey
                            </>
                        )}
                    </button>
                )}
            </div>

            {!supported && (
                <p className='mt-5 font-sans text-sm text-ink-soft'>This browser doesn't support passkeys.</p>
            )}
            {isDemo && (
                <p className='mt-5 font-sans text-sm text-ink-soft'>Passkeys aren't available on the demo account.</p>
            )}

            {loading ? null : passkeys.length === 0 ? (
                supported &&
                !isDemo && <p className='mt-5 font-sans text-sm text-ink-faint'>No passkeys yet.</p>
            ) : (
                <ul className='mt-6 divide-y divide-line border-y border-line'>
                    {passkeys.map(pk => (
                        <li key={pk.id} className='flex items-center justify-between gap-4 py-4'>
                            <div className='flex items-center gap-3'>
                                <FingerprintIcon className='text-brass' />
                                <div>
                                    <p className='font-sans text-sm text-ink'>
                                        {pk.name}
                                        {pk.backedUp && (
                                            <span className='ml-2 font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>
                                                Synced
                                            </span>
                                        )}
                                    </p>
                                    <p className='font-sans text-xs text-ink-faint'>
                                        Added {formatDate(pk.createdAt)} · Last used {formatDate(pk.lastUsedAt)}
                                    </p>
                                </div>
                            </div>
                            {!isDemo && (
                                <button
                                    type='button'
                                    onClick={() => remove(pk)}
                                    aria-label={`Remove ${pk.name}`}
                                    className='text-ink-faint hover:text-danger'
                                >
                                    <DeleteOutlineIcon fontSize='small' />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PasskeySettings;

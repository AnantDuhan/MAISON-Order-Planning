import React, { useEffect, useState } from 'react';
import { Dialog } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

import Field from '../layout/Field';
import { RESTOCK_HEAD_START_HOURS } from '../../utils/membershipTiers';

/*
 * Shown instead of "Add to bag" while the chosen option (or the product) is
 * sold out. Requests are per variant: waiting for Black says nothing about Sand.
 *   signed in  → one tap, emailed to the account address; tap again to cancel
 *   guest      → a small sheet asks for an email
 */

const sheetPaper = {
    sx: {
        m: { xs: 0, sm: 4 },
        width: { xs: '100%', sm: 460 },
        maxWidth: '100%',
        borderRadius: { xs: '18px 18px 0 0', sm: 0 },
        backgroundColor: 'rgb(var(--c-surface))',
        backgroundImage: 'none',
        color: 'rgb(var(--c-ink))',
        boxShadow: '0 24px 60px rgb(var(--c-shadow) / 0.25)',
    },
};

const GuestSheet = ({ open, onClose, productId, productName, variantId, variantLabel, onDone }) => {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const { data } = await axios.post(`/api/v1/product/${productId}/notify-me`, {
                email,
                ...(variantId && { variant: variantId }),
            });
            toast.success(data.message || "We'll email you when it's back.");
            onDone();
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            aria-labelledby='notify-title'
            sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } } }}
            PaperProps={sheetPaper}
        >
            <form onSubmit={submit} className='relative px-6 pb-7 pt-5 sm:px-8 sm:pb-8 sm:pt-8'>
                <span aria-hidden='true' className='mx-auto mb-4 block h-1 w-10 rounded-full bg-line sm:hidden' />
                <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close'
                    className='absolute right-3 top-3 grid h-11 w-11 place-items-center text-ink-soft hover:text-ink'
                >
                    <span aria-hidden='true' className='text-2xl leading-none'>×</span>
                </button>

                <p className='eyebrow'>Back in stock</p>
                <h2 id='notify-title' className='heading-display mt-2 text-3xl'>Notify me when it’s back</h2>
                <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                    We’ll email you once <span className='text-ink'>{productName}</span>
                    {variantLabel ? <> in <span className='text-ink'>{variantLabel}</span></> : null} is restocked.
                </p>

                <Field label='Email' className='mt-6'>
                    <input
                        type='email'
                        required
                        autoComplete='email'
                        placeholder='you@example.com'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </Field>
                {error && <p role='alert' className='mt-3 font-sans text-sm text-danger'>{error}</p>}

                <button type='submit' disabled={busy || !email.trim()} className='btn-solid mt-6 w-full disabled:opacity-50'>
                    {busy ? 'Saving…' : 'Notify me'}
                </button>
                <ul className='mt-5 space-y-2 font-sans text-xs text-ink-soft'>
                    <li>One email when it’s back — nothing else.</li>
                    <li>Maison Plus members hear {RESTOCK_HEAD_START_HOURS} hours earlier.</li>
                </ul>
            </form>
        </Dialog>
    );
};

const BackInStockButton = ({ productId, productName, variantId = null, variantLabel = '', needsVariant = false, isAuthenticated }) => {
    // What this shopper already waits for on this product (signed in only).
    const [waitingOn, setWaitingOn] = useState({ product: false, variants: [] });
    // Guests: requests made in this visit, so the button reflects them.
    const [guestDone, setGuestDone] = useState([]);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !productId) return undefined;
        let active = true;
        axios.get(`/api/v1/product/${productId}/notify-me`)
            .then(({ data }) => active && setWaitingOn({ product: Boolean(data.product), variants: data.variants || [] }))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [isAuthenticated, productId]);

    const key = variantId || '';
    const waiting = isAuthenticated
        ? (variantId ? waitingOn.variants.includes(variantId) : waitingOn.product)
        : guestDone.includes(key);

    const toggle = async () => {
        if (needsVariant) return;
        if (!isAuthenticated) {
            if (!waiting) setSheetOpen(true);
            return;
        }
        setBusy(true);
        try {
            if (waiting) {
                await axios.delete(`/api/v1/product/${productId}/notify-me`, { params: variantId ? { variant: variantId } : {} });
                setWaitingOn(w => (variantId
                    ? { ...w, variants: w.variants.filter(v => v !== variantId) }
                    : { ...w, product: false }));
                toast.info('You won’t be emailed about this one.');
            } else {
                const { data } = await axios.post(`/api/v1/product/${productId}/notify-me`, variantId ? { variant: variantId } : {});
                setWaitingOn(w => (variantId ? { ...w, variants: [...w.variants, variantId] } : { ...w, product: true }));
                toast.success(data.message || "We'll email you when it's back.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const label = needsVariant
        ? 'Choose an option to be notified'
        : waiting
            ? (isAuthenticated ? "You'll be notified · Cancel" : "You'll be notified")
            : 'Notify me when it’s back';

    return (
        <div className='flex flex-col gap-2'>
            <button
                onClick={toggle}
                disabled={busy || needsVariant || (!isAuthenticated && waiting)}
                className={`${waiting ? 'btn-outline' : 'btn-solid'} w-full disabled:opacity-50`}
            >
                {label}
            </button>
            <p className='font-sans text-xs text-ink-faint'>
                {needsVariant
                    ? 'Pick the size or colour you want, and we’ll tell you when that one is back.'
                    : waiting
                        ? `We’ll send one email${isAuthenticated ? ' to your account address' : ''} as soon as ${variantLabel || 'it'} is restocked.`
                        : `Get a single email the moment ${variantLabel ? `${variantLabel} is` : 'this piece is'} restocked.`}
            </p>
            {!isAuthenticated && (
                <GuestSheet
                    open={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    productId={productId}
                    productName={productName}
                    variantId={variantId}
                    variantLabel={variantLabel}
                    onDone={() => {
                        setGuestDone(done => [...done, key]);
                        setSheetOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default BackInStockButton;

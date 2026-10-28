import { Dialog } from '@mui/material';
import axios from 'axios';
import React, { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';

import ButtonSpinner from '../layout/ButtonSpinner';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const MIN_HINT = 20; // a nudge, not a rule: the server only needs some text

const Star = ({ filled }) => (
    <svg viewBox='0 0 24 24' className='h-9 w-9' aria-hidden='true'>
        <path
            d='M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z'
            fill={filled ? 'currentColor' : 'none'}
            stroke='currentColor'
            strokeWidth='1.3'
            strokeLinejoin='round'
        />
    </svg>
);

/** Five tappable stars (native radio buttons underneath, so keyboards and screen readers work). */
const StarInput = ({ value, onChange }) => {
    const [hover, setHover] = useState(0);
    const name = useId();
    const shown = hover || value;
    return (
        <fieldset>
            <legend className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>Your rating</legend>
            <div className='mt-2 flex items-center gap-4'>
                <div className='flex text-brass' onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <label key={n} className='cursor-pointer p-0.5' onMouseEnter={() => setHover(n)}>
                            <input
                                type='radio'
                                name={name}
                                value={n}
                                checked={value === n}
                                onChange={() => onChange(n)}
                                className='peer sr-only'
                            />
                            <span className='block rounded-sm transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-brass hover:scale-110'>
                                <Star filled={n <= shown} />
                            </span>
                            <span className='sr-only'>{n} {n === 1 ? 'star' : 'stars'}, {LABELS[n]}</span>
                        </label>
                    ))}
                </div>
                <span className='font-display text-xl text-ink' aria-live='polite'>{LABELS[shown] || ''}</span>
            </div>
        </fieldset>
    );
};

/**
 * Write (or edit) a review. Before showing the form it asks the server
 * whether this customer can review the product: reviews are only from
 * customers whose order with it has been delivered, and an earlier review
 * is loaded to edit. Phones get a bottom sheet.
 */
const ReviewDialog = ({ open, onClose, product, user, onSubmitted }) => {
    const [state, setState] = useState('loading'); // loading | signin | not-delivered | form | error
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [editing, setEditing] = useState(false);
    const [maxLength, setMaxLength] = useState(2000);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const commentId = useId();

    useEffect(() => {
        if (!open) return undefined;
        setMessage('');
        if (!user) {
            setState('signin');
            return undefined;
        }
        let alive = true;
        setState('loading');
        axios.get(`/api/v1/product/${product._id}/my-review`)
            .then(({ data }) => {
                if (!alive) return;
                setMaxLength(data.maxLength || 2000);
                setEditing(Boolean(data.review));
                setRating(data.review?.rating || 0);
                setComment(data.review?.comment || '');
                setState(data.canReview ? 'form' : 'not-delivered');
            })
            .catch(error => {
                if (!alive) return;
                setState(error.response?.status === 401 ? 'signin' : 'error');
            });
        return () => { alive = false; };
    }, [open, user, product?._id]);

    const trimmed = comment.trim();
    const canSubmit = rating > 0 && trimmed.length > 0 && !busy;

    const submit = async e => {
        e.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setMessage('');
        try {
            await axios.post('/api/v1/review', { productId: product._id, rating, comment: trimmed });
            onSubmitted?.(editing);
            onClose();
        } catch (error) {
            setMessage(error.response?.data?.message || 'Your review could not be posted. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const photo = (product?.images || []).find(img => img?.url)?.url;

    return (
        <Dialog
            open={open}
            onClose={busy ? undefined : onClose}
            aria-labelledby='review-dialog-title'
            sx={{ '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } } }}
            PaperProps={{
                sx: {
                    m: { xs: 0, sm: 4 },
                    width: { xs: '100%', sm: 560 },
                    maxWidth: '100%',
                    maxHeight: { xs: '92vh', sm: 'calc(100% - 64px)' },
                    borderRadius: { xs: '18px 18px 0 0', sm: 0 },
                    backgroundColor: 'rgb(var(--c-surface))',
                    backgroundImage: 'none',
                    color: 'rgb(var(--c-ink))',
                    boxShadow: '0 24px 60px rgb(var(--c-shadow) / 0.25)',
                },
            }}
        >
            <div className='relative px-6 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7'>
                <span aria-hidden='true' className='mx-auto mb-4 block h-1 w-10 rounded-full bg-line sm:hidden' />
                <button
                    type='button'
                    onClick={onClose}
                    disabled={busy}
                    aria-label='Close'
                    className='absolute right-4 top-4 flex h-10 w-10 items-center justify-center text-xl text-ink-faint hover:text-ink sm:right-5 sm:top-5'
                >
                    ×
                </button>

                {/* What's being reviewed */}
                <div className='flex items-center gap-4 pr-10'>
                    {photo && (
                        <span className='h-16 w-14 shrink-0 overflow-hidden border border-line bg-surface-2'>
                            <img src={photo} alt='' className='h-full w-full object-cover' />
                        </span>
                    )}
                    <div className='min-w-0'>
                        <p className='eyebrow'>{editing ? 'Edit your review' : 'Write a review'}</p>
                        <h2 id='review-dialog-title' className='mt-1 truncate font-display text-2xl text-ink'>{product?.name}</h2>
                    </div>
                </div>

                <div className='mt-6 border-t border-line pt-6'>
                    {state === 'loading' && (
                        <p className='flex items-center gap-3 py-6 font-sans text-sm text-ink-soft'><ButtonSpinner /> Checking your orders…</p>
                    )}

                    {state === 'signin' && (
                        <div className='py-2'>
                            <p className='font-sans text-sm leading-relaxed text-ink-soft'>
                                Sign in to review this piece. Reviews come from customers who have received it.
                            </p>
                            <Link to='/login' onClick={onClose} className='btn-solid mt-5 inline-flex'>Sign in</Link>
                        </div>
                    )}

                    {state === 'not-delivered' && (
                        <div className='py-2'>
                            <p className='font-sans text-sm leading-relaxed text-ink-soft'>
                                Reviews here come only from customers who have received the piece. Once an order with it has been
                                delivered to you, you can review it from this page.
                            </p>
                            <Link to='/orders' onClick={onClose} className='btn-outline mt-5 inline-flex'>See my orders</Link>
                        </div>
                    )}

                    {state === 'error' && (
                        <p role='alert' className='py-2 font-sans text-sm text-danger'>
                            We couldn&apos;t open the review form just now. Please try again in a moment.
                        </p>
                    )}

                    {state === 'form' && (
                        <form onSubmit={submit} className='flex flex-col gap-6'>
                            <StarInput value={rating} onChange={setRating} />

                            <div>
                                <div className='flex items-baseline justify-between gap-3'>
                                    <label htmlFor={commentId} className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>Your review</label>
                                    <span className='font-sans text-xs text-ink-faint'>{comment.length}/{maxLength}</span>
                                </div>
                                <textarea
                                    id={commentId}
                                    rows={5}
                                    maxLength={maxLength}
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder='What did you like? How is the quality, the fit, the finish? Anything others should know?'
                                    className='mt-2 w-full resize-y border border-line bg-canvas p-4 font-sans text-[0.95rem] leading-relaxed text-ink placeholder:text-ink-faint/70 focus:border-ink focus:outline-none'
                                />
                                {trimmed.length > 0 && trimmed.length < MIN_HINT && (
                                    <p className='mt-1.5 font-sans text-xs text-ink-faint'>A sentence or two helps other shoppers most.</p>
                                )}
                            </div>

                            {message && <p role='alert' className='font-sans text-sm text-danger'>{message}</p>}

                            <div className='flex flex-col gap-3'>
                                <p className='font-sans text-xs text-ink-faint'>Posted as {user?.name || 'you'} · you can edit it later.</p>
                                <div className='flex gap-3 sm:justify-end'>
                                    <button type='button' onClick={onClose} disabled={busy} className='btn-outline flex-1 whitespace-nowrap !px-5 sm:flex-none'>Cancel</button>
                                    <button type='submit' disabled={!canSubmit} className='btn-solid flex-[2] whitespace-nowrap !px-5 disabled:opacity-40 sm:flex-none sm:!px-8'>
                                        {busy ? (<><ButtonSpinner />Posting…</>) : editing ? 'Update review' : 'Post review'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </Dialog>
    );
};

export default ReviewDialog;

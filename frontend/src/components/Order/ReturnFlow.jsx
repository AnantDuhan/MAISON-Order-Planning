import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { formatDeadline, isWithinReturnWindow, RETURN_WINDOW_DAYS, returnDeadline } from '../../utils/returnWindow';
import { inr } from './OrderItemsList';

const DAY_MS = 24 * 60 * 60 * 1000;
const shortDate = value => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null);

export const RETURN_REASONS = [
    { value: 'Damaged or defective', hint: 'It arrived broken, scratched or doesn’t work.' },
    { value: 'Wrong item sent', hint: 'Different product, size or colour from what you ordered.' },
    { value: 'Missing parts or items', hint: 'Something from the order or the box is missing.' },
    { value: 'Not as described', hint: 'It doesn’t match the photos or description.' },
    { value: 'Doesn’t suit me', hint: 'Fit, size or style isn’t right for you.' },
    { value: 'Changed my mind', hint: 'You no longer need it.' },
    { value: 'Other', hint: 'Tell us in your own words.' },
];
const NEEDS_DETAILS = new Set(['Other']);

// ---- Where a return stands ---------------------------------------------------

/**
 * The customer's view of a return, from the order and its latest return
 * request (order.returnInfo). null when no return has been requested.
 */
export const returnStage = order => {
    if (!order?.isReturned && !order?.return?.length) return null;
    const info = order.returnInfo || {};
    const refunded = Boolean(order.isRefunded) || order.refundStatus === 'Refunded';
    const declined = !refunded && (info.status === 'Rejected' || order.refundStatus === 'Rejected');
    const refundStarted = refunded || ['Processing', 'Pending', 'Approved'].includes(order.refundStatus);
    const approved = refundStarted || ['Approved', 'Completed', 'Initiated'].includes(info.status);
    const key = refunded ? 'refunded' : declined ? 'declined' : refundStarted ? 'refunding' : approved ? 'approved' : 'requested';
    return { key, info, refunded, declined, refundStarted, approved };
};

export const RETURN_STATUS_LABEL = {
    requested: 'Return requested',
    approved: 'Return approved',
    refunding: 'Refund in progress',
    refunded: 'Refunded',
    declined: 'Return declined',
};

// ---- Eligibility card ----------------------------------------------------------

/** Shown on delivered orders without a return: how long is left, and the way in. */
export const ReturnEligibility = ({ order, returnsOn, onStart }) => {
    if (order?.orderStatus !== 'Delivered' || returnStage(order) || order?.isRefunded) return null;

    const deadline = returnDeadline(order);
    const open = isWithinReturnWindow(order);

    if (!returnsOn) {
        return (
            <section className='border border-line bg-surface p-5 sm:p-6'>
                <p className='font-display text-xl text-ink'>Need to return something?</p>
                <p className='mt-2 font-sans text-sm text-ink-soft'>
                    Return requests are paused right now.{' '}
                    <Link to='/contact-us' className='text-brass underline-offset-4 hover:underline'>Contact us</Link> about this order and we’ll help.
                </p>
            </section>
        );
    }

    if (!open) {
        return (
            <section className='border border-line bg-surface p-5 sm:p-6'>
                <p className='font-display text-xl text-ink'>Return window closed</p>
                <p className='mt-2 font-sans text-sm text-ink-soft'>
                    Returns were open until {formatDeadline(deadline)}. If something is wrong with your order,{' '}
                    <Link to='/contact-us' className='text-brass underline-offset-4 hover:underline'>contact us</Link>.
                </p>
            </section>
        );
    }

    const daysLeft = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / DAY_MS)) : null;
    const share = daysLeft != null ? Math.min(1, daysLeft / RETURN_WINDOW_DAYS) : 1;

    return (
        <section className='border border-brass/40 bg-surface p-5 sm:p-6'>
            <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                    <p className='font-display text-xl text-ink'>Not quite right?</p>
                    <p className='mt-1 font-sans text-sm text-ink-soft'>
                        {deadline
                            ? <>You can return this order until <span className='text-ink'>{formatDeadline(deadline)}</span>.</>
                            : `Returns are accepted within ${RETURN_WINDOW_DAYS} days of delivery.`}
                    </p>
                    {daysLeft != null && (
                        <div className='mt-3 flex items-center gap-3'>
                            <div className='h-1 w-28 overflow-hidden rounded-full bg-line' aria-hidden='true'>
                                <div className='h-full rounded-full bg-brass' style={{ width: `${share * 100}%` }} />
                            </div>
                            <span className='font-sans text-xs text-ink-faint'>
                                {daysLeft === 0 ? 'Last day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                            </span>
                        </div>
                    )}
                </div>
                <button type='button' onClick={onStart} className='btn-outline w-full shrink-0 !py-3 sm:w-auto'>
                    Start a return
                </button>
            </div>
        </section>
    );
};

// ---- Tracker -------------------------------------------------------------------

const Step = ({ label, date, state, last }) => (
    <li className='relative flex gap-4 pb-6 last:pb-0'>
        {!last && (
            <span aria-hidden='true' className={`absolute left-[7px] top-4 h-full w-px ${state === 'done' ? 'bg-brass' : 'bg-line'}`} />
        )}
        <span
            className={`relative mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                state === 'done' ? 'border-brass bg-brass'
                    : state === 'failed' ? 'border-danger bg-danger'
                        : state === 'current' ? 'border-brass bg-surface'
                            : 'border-line bg-surface'}`}
        />
        <div className='-mt-0.5'>
            <p className={`font-sans text-sm ${state === 'todo' ? 'text-ink-faint' : state === 'failed' ? 'text-danger' : 'text-ink'}`}>{label}</p>
            {date && <p className='mt-0.5 font-sans text-xs text-ink-faint'>{date}</p>}
        </div>
    </li>
);

/** Requested → Approved → Refund started → Refunded, with what happens next. */
export const ReturnTracker = ({ order }) => {
    const stage = returnStage(order);
    if (!stage) return null;
    const { info } = stage;
    const amount = inr(order.refundInfo?.amount || order.totalPrice);

    const copy = {
        requested: ['Return requested', 'We’re reviewing your request and will email you with how to send the items back.'],
        approved: ['Return approved', 'Pack the items unused, in their original packaging, and follow the steps in our email. Your refund starts once they’re back with us.'],
        refunding: ['Your refund is on its way', `We’ve started a refund of ${amount} to your original payment method. Your bank may take a few working days to show it.`],
        refunded: [`Refunded ${amount}`, `Sent to your original payment method${order.refundedAt ? ` on ${formatDeadline(new Date(order.refundedAt))}` : ''}. Your bank may take a few working days to show it.`],
        declined: ['We couldn’t accept this return', 'If you think this is a mistake, contact us and we’ll take another look.'],
    }[stage.key];

    const steps = [
        { label: 'Return requested', date: shortDate(order.returnRequestedAt || info.requestedAt), state: 'done' },
        stage.declined
            ? { label: 'Declined', date: shortDate(info.resolvedAt), state: 'failed' }
            : { label: 'Approved', date: shortDate(info.approvedAt), state: stage.approved ? 'done' : 'current' },
        ...(stage.declined ? [] : [
            { label: 'Refund started', date: shortDate(order.refundRequestedAt), state: stage.refundStarted ? 'done' : 'todo' },
            { label: 'Refunded', date: shortDate(order.refundedAt), state: stage.refunded ? 'done' : stage.refundStarted ? 'current' : 'todo' },
        ]),
    ];

    return (
        <section aria-label='Return progress' className={`border bg-surface p-5 sm:p-8 ${stage.declined ? 'border-danger/40' : 'border-brass/40'}`}>
            <p className='eyebrow'>Your return</p>
            <p className='mt-3 font-display text-2xl text-ink'>{copy[0]}</p>
            <p className='mt-2 font-sans text-sm leading-relaxed text-ink-soft'>{copy[1]}</p>

            <ol className='mt-6'>
                {steps.map((step, i) => (
                    <Step key={step.label} {...step} last={i === steps.length - 1} />
                ))}
            </ol>

            {(info.reason || order.returnReason) && (
                <div className='mt-6 border-t border-line pt-4 font-sans text-sm'>
                    <p className='text-ink-faint'>Reason</p>
                    <p className='mt-1 text-ink'>{info.reason || order.returnReason}</p>
                    {info.details && <p className='mt-1 text-ink-soft'>“{info.details}”</p>}
                </div>
            )}

            <div className='mt-5 flex flex-wrap gap-x-6 gap-y-2'>
                {stage.refunded && (
                    <a href={`/api/v1/order/${order._id}/credit-note`} download className='font-sans text-sm text-brass underline-offset-4 hover:underline'>
                        Download credit note
                    </a>
                )}
                <Link to='/contact-us' className='font-sans text-sm text-ink-soft hover:text-brass'>
                    Questions about this return?
                </Link>
            </div>
        </section>
    );
};

// ---- Request sheet ---------------------------------------------------------------

const Thumb = ({ item }) => {
    const src = (item.images || []).find(img => img?.url)?.url || item.image;
    return (
        <div className='h-16 w-14 shrink-0 overflow-hidden border border-line bg-surface-2'>
            {src
                ? <img src={src} alt='' className='h-full w-full object-cover' />
                : <div className='grid h-full w-full place-items-center text-ink-faint'><ShoppingBagOutlinedIcon fontSize='small' /></div>}
        </div>
    );
};

/**
 * Two steps (reason, then review) and a confirmation. A bottom sheet on
 * phones, a centred dialog from 640px. onSubmit(reason, details) must throw
 * on failure so the sheet can show the error and stay open.
 */
export const ReturnSheet = ({ open, order, onClose, onSubmit }) => {
    const [step, setStep] = useState('reason');
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        setStep('reason');
        setError('');
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = e => { if (e.key === 'Escape' && !busy) onClose(); };
        window.addEventListener('keydown', onKey);
        panelRef.current?.focus();
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open || !order) return null;

    const items = order.orderItems || [];
    const detailsRequired = NEEDS_DETAILS.has(reason);
    const canContinue = reason && (!detailsRequired || details.trim().length >= 5);
    const deadline = returnDeadline(order);

    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            await onSubmit(reason, details.trim());
            setStep('done');
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Could not request the return. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const title = { reason: 'Why are you returning it?', review: 'Check and confirm', done: 'Return requested' }[step];

    return (
        <div className='fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6' role='presentation'>
            <div className='absolute inset-0 bg-ink/50 backdrop-blur-[2px]' onClick={() => !busy && onClose()} aria-hidden='true' />
            <div
                ref={panelRef}
                tabIndex={-1}
                role='dialog'
                aria-modal='true'
                aria-labelledby='return-sheet-title'
                className='relative flex max-h-[92vh] w-full flex-col overflow-hidden border-line bg-canvas shadow-luxe outline-none sm:max-w-lg sm:border'
            >
                {/* Header */}
                <div className='flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-7'>
                    <div>
                        {step !== 'done' && (
                            <p className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass'>
                                Step {step === 'reason' ? 1 : 2} of 2
                            </p>
                        )}
                        <h2 id='return-sheet-title' className='mt-1 font-display text-2xl text-ink'>{title}</h2>
                    </div>
                    <button type='button' onClick={onClose} disabled={busy} aria-label='Close' className='-mr-1 p-1 text-ink-soft hover:text-ink disabled:opacity-40'>
                        <CloseIcon fontSize='small' />
                    </button>
                </div>

                {/* Body */}
                <div className='flex-1 overflow-y-auto px-5 py-5 sm:px-7'>
                    {step === 'reason' && (
                        <fieldset>
                            <legend className='sr-only'>Reason for the return</legend>
                            <div className='flex flex-col gap-2'>
                                {RETURN_REASONS.map(r => {
                                    const checked = reason === r.value;
                                    return (
                                        <label
                                            key={r.value}
                                            className={`flex cursor-pointer gap-3 border px-4 py-3 transition-colors ${checked ? 'border-brass bg-brass/5' : 'border-line hover:border-ink-faint'}`}
                                        >
                                            <input
                                                type='radio'
                                                name='return-reason'
                                                value={r.value}
                                                checked={checked}
                                                onChange={() => setReason(r.value)}
                                                className='mt-1 accent-[#A07C4B]'
                                            />
                                            <span>
                                                <span className='block font-sans text-sm text-ink'>{r.value}</span>
                                                <span className='block font-sans text-xs text-ink-faint'>{r.hint}</span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <label htmlFor='return-details' className='mt-5 block font-sans text-sm text-ink'>
                                Tell us more {detailsRequired ? '' : <span className='text-ink-faint'>(optional)</span>}
                            </label>
                            <textarea
                                id='return-details'
                                rows={3}
                                maxLength={500}
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                placeholder='What happened? Details help us sort it out faster.'
                                className='mt-2 w-full resize-none border border-line bg-transparent p-3 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                            />
                            <p className='mt-1 text-right font-sans text-xs text-ink-faint'>{details.length}/500</p>
                        </fieldset>
                    )}

                    {step === 'review' && (
                        <div className='space-y-6'>
                            <div>
                                <p className='font-sans text-xs uppercase tracking-luxe text-ink-faint'>
                                    Returning {items.length === 1 ? 'this item' : `all ${items.length} items`}
                                </p>
                                <ul className='mt-3 divide-y divide-line border-y border-line'>
                                    {items.map((item, i) => (
                                        <li key={item._id || i} className='flex items-center gap-3 py-3'>
                                            <Thumb item={item} />
                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate font-sans text-sm text-ink'>{item.name}</p>
                                                <p className='font-sans text-xs text-ink-faint'>
                                                    {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.quantity}
                                                </p>
                                            </div>
                                            <p className='font-sans text-sm text-ink-soft'>{inr(item.price * item.quantity)}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className='flex items-start justify-between gap-4 border border-line bg-surface p-4'>
                                <div>
                                    <p className='font-sans text-sm text-ink'>Reason</p>
                                    <p className='mt-0.5 font-sans text-sm text-ink-soft'>{reason}</p>
                                    {details.trim() && <p className='mt-1 line-clamp-2 font-sans text-xs text-ink-faint'>“{details.trim()}”</p>}
                                </div>
                                <button type='button' onClick={() => setStep('reason')} className='font-sans text-sm text-brass underline-offset-4 hover:underline'>
                                    Edit
                                </button>
                            </div>

                            <div className='border border-line bg-surface p-4'>
                                <div className='flex items-baseline justify-between'>
                                    <p className='font-sans text-sm text-ink'>Refund once approved</p>
                                    <p className='font-display text-2xl text-ink'>{inr(order.totalPrice)}</p>
                                </div>
                                <p className='mt-1 font-sans text-xs text-ink-faint'>To your original payment method.</p>
                            </div>

                            <ul className='space-y-2 font-sans text-sm text-ink-soft'>
                                <li>• Keep the items unused, in their original packaging, with all accessories.</li>
                                <li>• We’ll email you with how to send them back.</li>
                                {deadline && <li>• Requests are accepted until {formatDeadline(deadline)}.</li>}
                            </ul>

                            {error && <p role='alert' className='font-sans text-sm text-danger'>{error}</p>}
                        </div>
                    )}

                    {step === 'done' && (
                        <div className='flex flex-col items-center py-6 text-center'>
                            <CheckCircleOutlineIcon className='text-success' sx={{ fontSize: 48 }} />
                            <p className='mt-4 max-w-sm font-sans text-sm leading-relaxed text-ink-soft'>
                                We’ve got your request for order {order._id}.
                                {order.user?.email ? <> We’ll email <span className='text-ink'>{order.user.email}</span></> : ' We’ll email you'} with
                                how to send the items back. You can follow the return on this page.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className='border-t border-line px-5 py-4 sm:px-7'>
                    {step === 'reason' && (
                        <button type='button' disabled={!canContinue} onClick={() => setStep('review')} className='btn-solid w-full !py-3.5 disabled:opacity-40'>
                            Continue
                        </button>
                    )}
                    {step === 'review' && (
                        <div className='grid grid-cols-[auto_1fr] gap-3'>
                            <button type='button' onClick={() => setStep('reason')} disabled={busy} className='btn-outline !px-5 !py-3.5'>
                                Back
                            </button>
                            <button type='button' onClick={submit} disabled={busy} className='btn-solid !py-3.5 disabled:opacity-60'>
                                {busy ? 'Sending…' : 'Request return'}
                            </button>
                        </div>
                    )}
                    {step === 'done' && (
                        <button type='button' onClick={onClose} className='btn-solid w-full !py-3.5'>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

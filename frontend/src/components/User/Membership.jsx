import React, { Fragment, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

import MetaData from '../layout/MetaData';
import { useFeature } from '../../context/FeatureFlagsContext';
import { formatINR } from '../../utils/priceLabel';
import { TIERS, tierName } from '../../utils/membershipTiers';
import { loadCashfree, preloadCashfree } from '../../utils/loadCashfree';

const planKeyOf = membership => {
    const id = String(membership?.planId || '');
    if (/essential/i.test(id)) return 'essential-yearly';
    return /monthly/i.test(id) ? 'plus-monthly' : 'plus-yearly';
};

const Check = () => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true' className='mt-0.5 shrink-0 text-brass'>
        <path d='M5 12l4 4 10-10' />
    </svg>
);


const Membership = () => {
    const [plans, setPlans] = useState([]);
    const [membership, setMembership] = useState(null);
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);

    useEffect(preloadCashfree, []);

    useEffect(() => {
        axios.get('/api/v1/membership/plans').then(({ data }) => setPlans(data.plans)).catch(error => {
            toast.error(error.response?.data?.message || 'Could not load membership plans.');
        });

        const returnedSubscriptionId = new URLSearchParams(window.location.search).get('subscription_id');
        if (returnedSubscriptionId) {
            axios.get(`/api/v1/membership/${returnedSubscriptionId}`)
                .then(({ data }) => {
                    setMembership(data.membership);
                    window.history.replaceState({}, document.title, '/membership');
                    toast.success('Membership authorization status updated.');
                })
                .catch(error => toast.error(error.response?.data?.message || 'Could not verify membership authorization.'));
        } else {
            axios.get('/api/v1/membership/current')
                .then(({ data }) => setMembership(data.membership))
                .catch(() => {});
        }

        axios.get('/api/v1/invoices/me', { params: { type: 'membership' } })
            .then(({ data }) => setInvoices(data.invoices || []))
            .catch(() => {});
    }, []);

    const membershipsOn = useFeature('memberships');

    const startMembership = async plan => {
        setLoading(true);
        try {
            // SDK first, so a failed load doesn't leave a half-started membership.
            const cashfree = await loadCashfree();
            const { data } = await axios.post('/api/v1/membership', { plan });
            await cashfree.subscriptionsCheckout({
                subsSessionId: data.subscriptionSessionId,
                redirectTarget: '_self',
            });
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Could not start membership.');
        } finally {
            setLoading(false);
        }
    };

    const continueAuthorization = async () => {
        setLoading(true);
        try {
            if (!membership?.subscriptionSessionId) {
                await startMembership(planKeyOf(membership));
                return;
            }
            const cashfree = await loadCashfree();
            await cashfree.subscriptionsCheckout({
                subsSessionId: membership.subscriptionSessionId,
                redirectTarget: '_self',
            });
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const cancelMembership = async () => {
        try {
            const { data } = await axios.post(`/api/v1/membership/${membership.subscriptionId}/cancel`);
            setMembership(data.membership);
            toast.success('Membership cancelled.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not cancel membership.');
        }
    };

    const isMember = membership?.isActive && membership.status === 'ACTIVE';
    const nextPaymentDate = membership?.nextPaymentDate
        ? new Date(membership.nextPaymentDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : 'Cashfree will confirm the next billing date';
    const statusMessage = {
        INITIALIZED: 'Membership created. Complete Cashfree authorization to activate it.',
        BANK_APPROVAL_PENDING: 'Authorization received. Cashfree is waiting for bank approval.',
        ACTIVE: 'Your recurring membership is active.',
        ON_HOLD: 'A recurring payment needs attention.',
        CANCELLED: 'This membership has been cancelled.',
    }[membership?.status] || 'Cashfree is processing your membership status.';
    const isAuthorizationPending = ['INITIALIZED', 'BANK_APPROVAL_PENDING'].includes(membership?.status);

    const planBy = key => plans.find(p => p.key === key);
    const essential = planBy('essential-yearly');
    const plusMonthly = planBy('plus-monthly');
    const plusYearly = planBy('plus-yearly');
    const yearlySaving = plusMonthly && plusYearly
        ? Math.round((1 - plusYearly.amount / (plusMonthly.amount * 12)) * 100)
        : 0;
    const currentTier = isMember ? (membership.tier || 'plus') : null;
    const canJoin = !membership || (!isMember && !isAuthorizationPending);

    const TierCard = ({ tier, children, highlight }) => (
        <div className={`flex flex-col border bg-surface p-6 sm:p-8 ${highlight ? 'border-brass' : 'border-line'}`}>
            <div className='flex items-baseline justify-between gap-3'>
                <h2 className='font-display text-3xl text-ink'>{TIERS[tier].name}</h2>
                {currentTier === tier && <span className='border border-brass px-2 py-1 font-sans text-[0.62rem] uppercase tracking-luxe text-brass'>Your plan</span>}
                {highlight && currentTier !== tier && <span className='bg-brass px-2 py-1 font-sans text-[0.62rem] uppercase tracking-luxe text-white'>Best value</span>}
            </div>
            <p className='mt-2 font-sans text-sm text-ink-soft'>{TIERS[tier].pitch}</p>
            <ul className='mt-6 flex-1 space-y-3'>
                {TIERS[tier].benefits.map(b => (
                    <li key={b.title} className='flex gap-3'>
                        <Check />
                        <span>
                            <span className='block font-sans text-sm text-ink'>{b.title}</span>
                            <span className='block font-sans text-xs leading-relaxed text-ink-faint'>{b.detail}</span>
                        </span>
                    </li>
                ))}
            </ul>
            <div className='mt-8'>{children}</div>
        </div>
    );

    return (
        <Fragment>
            <MetaData title='Membership · Maison' />
            <div className='editorial-shell py-16'>
                <p className='eyebrow'>Maison Membership</p>
                <h1 className='mt-4 max-w-2xl font-display text-5xl font-medium text-ink'>A quieter way to shop well.</h1>
                <p className='mt-5 max-w-xl font-sans text-sm leading-relaxed text-ink-soft'>
                    Two memberships, both billed automatically through Cashfree. Cancel any time from this page.
                </p>

                {membership && (
                    <div className='mt-12 border border-line bg-surface p-8'>
                        <p className='eyebrow'>{isMember ? 'You are a Maison member' : 'Membership status'}</p>
                        <p className='mt-3 font-display text-3xl text-ink'>{tierName(membership.tier || 'plus') || membership.name}</p>
                        <p className='mt-3 font-sans text-sm text-ink-soft'>{statusMessage}</p>
                        {isAuthorizationPending && membership.status === 'INITIALIZED' && (
                            <button
                                disabled={loading}
                                onClick={continueAuthorization}
                                className='btn-solid mt-6 w-full disabled:opacity-40 sm:w-auto'
                            >
                                {membership.subscriptionSessionId ? 'Continue authorization in Cashfree' : 'Restart Cashfree authorization'}
                            </button>
                        )}
                        {isMember && (
                            <p className='mt-2 font-sans text-sm text-ink-soft'>Next payment date: <strong className='text-ink'>{nextPaymentDate}</strong></p>
                        )}
                        {isMember && currentTier === 'essential' && (
                            <p className='mt-2 font-sans text-sm text-ink-soft'>
                                To move to Plus, cancel Essential below and join Plus — your benefits switch over straight away.
                            </p>
                        )}
                        {membership && !['CANCELLED', 'COMPLETED', 'EXPIRED', 'CUSTOMER_CANCELLED'].includes(membership.status) && (
                            <button onClick={cancelMembership} className='mt-6 font-sans text-xs uppercase tracking-luxe text-brass'>Cancel membership</button>
                        )}
                    </div>
                )}

                <div className='mt-12 grid gap-6 lg:grid-cols-2'>
                    <TierCard tier='essential'>
                        <p className='font-display text-4xl text-ink'>{essential ? formatINR(essential.amount) : '—'}<span className='font-sans text-sm text-ink-soft'> / year</span></p>
                        <p className='mt-1 font-sans text-xs text-ink-faint'>About {essential ? formatINR(Math.round(essential.amount / 12)) : '—'} a month</p>
                        {canJoin && (
                            <button disabled={loading || !membershipsOn || !essential} onClick={() => startMembership('essential-yearly')} className='btn-outline mt-6 w-full disabled:opacity-40'>
                                Join Essential
                            </button>
                        )}
                    </TierCard>

                    <TierCard tier='plus' highlight>
                        <div className='grid gap-3 sm:grid-cols-2'>
                            <div className='border border-line p-4'>
                                <p className='font-sans text-xs uppercase tracking-luxe text-ink-faint'>Monthly</p>
                                <p className='mt-2 font-display text-3xl text-ink'>{plusMonthly ? formatINR(plusMonthly.amount) : '—'}<span className='font-sans text-sm text-ink-soft'> / month</span></p>
                                {canJoin && (
                                    <button disabled={loading || !membershipsOn || !plusMonthly} onClick={() => startMembership('plus-monthly')} className='btn-outline mt-4 w-full !px-4 disabled:opacity-40'>
                                        Join monthly
                                    </button>
                                )}
                            </div>
                            <div className='border border-brass p-4'>
                                <p className='font-sans text-xs uppercase tracking-luxe text-brass'>Yearly{yearlySaving > 0 ? ` · save ${yearlySaving}%` : ''}</p>
                                <p className='mt-2 font-display text-3xl text-ink'>{plusYearly ? formatINR(plusYearly.amount) : '—'}<span className='font-sans text-sm text-ink-soft'> / year</span></p>
                                {canJoin && (
                                    <button disabled={loading || !membershipsOn || !plusYearly} onClick={() => startMembership('plus-yearly')} className='btn-solid mt-4 w-full !px-4 disabled:opacity-40'>
                                        Join yearly
                                    </button>
                                )}
                            </div>
                        </div>
                    </TierCard>
                </div>
                {!membershipsOn && canJoin && (
                    <p className='mt-4 font-sans text-sm text-ink-faint'>New memberships are paused right now.</p>
                )}

                {invoices.length > 0 && (
                    <div className='mt-12 border border-line bg-surface p-8'>
                        <p className='eyebrow'>Billing history</p>
                        <ul className='mt-5 divide-y divide-line'>
                            {invoices.map(invoice => (
                                <li key={invoice._id} className='flex flex-wrap items-center justify-between gap-3 py-4'>
                                    <div>
                                        <p className='font-display text-lg text-ink'>{invoice.invoiceNumber}</p>
                                        <p className='font-sans text-xs text-ink-soft'>
                                            {new Date(invoice.issuedAt).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <div className='flex items-center gap-6'>
                                        <span className='font-display text-lg text-ink'>{formatINR(invoice.total)}</span>
                                        <a
                                            href={`/api/v1/invoice/${invoice._id}/download`}
                                            download
                                            className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass transition-opacity hover:opacity-70'
                                        >
                                            Download ↓
                                        </a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Fragment>
    );
};

export default Membership;
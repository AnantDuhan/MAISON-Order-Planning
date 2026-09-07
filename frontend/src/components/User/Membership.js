import React, { Fragment, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

import MetaData from '../layout/MetaData';

const cashfree = window.Cashfree
    ? window.Cashfree({ mode: process.env.REACT_APP_CASHFREE_MODE || 'sandbox' })
    : null;

const Membership = () => {
    const [plans, setPlans] = useState([]);
    const [membership, setMembership] = useState(null);
    const [loading, setLoading] = useState(false);

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
    }, []);

    const startMembership = async interval => {
        setLoading(true);
        try {
            if (!cashfree) throw new Error('Cashfree checkout is unavailable. Please refresh and try again.');
            const { data } = await axios.post('/api/v1/membership', { interval });
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
                const interval = membership?.planId === 'maison-yearly' ? 'yearly' : 'monthly';
                await startMembership(interval);
                return;
            }
            if (!cashfree) {
                throw new Error('Cashfree checkout is unavailable. Please refresh and try again.');
            }
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

    return (
        <Fragment>
            <MetaData title='Membership · Maison' />
            <div className='editorial-shell py-16'>
                <p className='eyebrow'>Maison Membership</p>
                <h1 className='mt-4 max-w-2xl font-display text-5xl font-medium text-ink'>A quieter way to shop well.</h1>
                <p className='mt-5 max-w-xl font-sans text-sm leading-relaxed text-ink-soft'>
                    Choose a recurring membership and authorize secure automatic billing through Cashfree.
                </p>
                <div className='mt-8 grid gap-3 font-sans text-sm text-ink-soft sm:grid-cols-3'>
                    <span className='border-l-2 border-brass pl-3'>Complimentary shipping</span>
                    <span className='border-l-2 border-brass pl-3'>Early access to new drops</span>
                    <span className='border-l-2 border-brass pl-3'>Member-only offers</span>
                </div>
                {membership && (
                    <div className='mt-12 border border-line bg-surface p-8'>
                        <p className='eyebrow'>{isMember ? 'You are a Maison member' : 'Membership status'}</p>
                        <p className='mt-3 font-display text-3xl text-ink'>{membership.name}</p>
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
                        {membership && !['CANCELLED', 'COMPLETED', 'EXPIRED', 'CUSTOMER_CANCELLED'].includes(membership.status) && (
                            <button onClick={cancelMembership} className='mt-6 font-sans text-xs uppercase tracking-luxe text-brass'>Cancel membership</button>
                        )}
                    </div>
                )}
                {(!membership || (!isMember && !isAuthorizationPending)) && (
                    <div className='mt-12 grid gap-6 md:grid-cols-2'>
                        {plans.map(plan => (
                            <div key={plan.interval} className='border border-line bg-surface p-8'>
                                <p className='eyebrow'>{plan.interval}</p>
                                <h2 className='mt-4 font-display text-3xl text-ink'>{plan.name}</h2>
                                <p className='mt-6 font-display text-4xl text-ink'>₹{plan.amount}</p>
                                <p className='mt-2 font-sans text-sm text-ink-soft'>Billed {plan.interval}ly</p>
                                <button disabled={loading} onClick={() => startMembership(plan.interval)} className='btn-solid mt-8 w-full disabled:opacity-40'>
                                    Authorize Membership
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Fragment>
    );
};

export default Membership;
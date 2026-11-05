import React, { Fragment, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

import DeliveryProgress from './DeliveryProgress';
import TrackingTimeline from './TrackingTimeline';
import OrderItemsList, { inr } from './OrderItemsList';
import Field from '../layout/Field';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';
import { stateName } from '../../utils/indiaRegions';
import { claimSignupPath } from '../../utils/guestCheckout';

/*
 * Public order tracking, no sign-in needed.
 *   /track            order number + email form
 *   /track/:id?t=…    a signed link (from the form, an email or the
 *                     guest order confirmation) that shows one order
 * The server only returns a trimmed view: no street address or phone.
 */

const formatDate = value => (value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '');

const LookupForm = ({ initialOrderId = '', notice }) => {
    const navigate = useNavigate();
    const [orderId, setOrderId] = useState(initialOrderId);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(notice || '');

    const submit = async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const { data } = await axios.post('/api/v1/order/track', { orderId, email });
            navigate(`/track/${data.order._id}?t=${encodeURIComponent(data.token)}`, { state: { order: data.order } });
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
            setBusy(false);
        }
    };

    return (
        <div className='editorial-shell py-16'>
            <div className='mx-auto max-w-xl'>
                <p className='eyebrow'>Order tracking</p>
                <h1 className='heading-display mt-2 text-4xl sm:text-5xl'>Track your order</h1>
                <p className='mt-4 font-sans text-sm leading-relaxed text-ink-soft'>
                    Enter the order number from your confirmation email and the email address you ordered with.
                    No account needed.
                </p>

                <form onSubmit={submit} className='mt-10 space-y-8 border border-line bg-surface p-6 sm:p-8' noValidate>
                    <Field label='Order number'>
                        <input
                            type='text'
                            required
                            autoComplete='off'
                            spellCheck='false'
                            placeholder='e.g. kzsmhij4'
                            value={orderId}
                            onChange={e => setOrderId(e.target.value)}
                        />
                    </Field>
                    <Field label='Email'>
                        <input
                            type='email'
                            required
                            autoComplete='email'
                            placeholder='you@example.com'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </Field>
                    {error && <p role='alert' className='font-sans text-sm text-danger'>{error}</p>}
                    <button type='submit' disabled={busy || !orderId.trim() || !email.trim()} className='btn-solid w-full disabled:opacity-50'>
                        {busy ? 'Looking it up…' : 'Track order'}
                    </button>
                </form>

                <p className='mt-6 font-sans text-sm text-ink-soft'>
                    Have an account? <Link to='/orders' className='text-brass underline-offset-4 hover:underline'>See all your orders</Link>
                </p>
            </div>
        </div>
    );
};

const TrackedOrder = ({ order }) => {
    const { isAuthenticated } = useSelector(state => state.user);
    const itemCount = (order.orderItems || []).reduce((n, item) => n + (item.quantity || 0), 0);
    const shipment = order.shipment || {};
    const shipTo = [order.shipTo?.city, order.shipTo?.state && stateName('IN', order.shipTo.state), order.shipTo?.pinCode]
        .filter(Boolean)
        .join(', ');

    return (
        <div className='editorial-shell py-14'>
            <header className='flex flex-col gap-4 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                    <p className='eyebrow'>Order tracking</p>
                    <h1 className='heading-display mt-3 break-all text-4xl sm:text-5xl'>Order {order._id}</h1>
                    <p className='mt-3 font-sans text-sm text-ink-soft'>
                        Placed {formatDate(order.createdAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'} · {inr(order.totalPrice)}
                    </p>
                </div>
                {isAuthenticated && !order.isGuest && (
                    <Link to={`/order/${order._id}`} className='btn-outline self-start sm:self-auto'>View full order</Link>
                )}
            </header>

            <div className='mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]'>
                <div className='space-y-12'>
                    <DeliveryProgress order={order} />
                    {shipment.events?.length > 0 && <TrackingTimeline shipment={shipment} />}
                    <section aria-labelledby='track-items'>
                        <h2 id='track-items' className='font-display text-2xl text-ink'>
                            {itemCount === 1 ? 'Your item' : `Your ${itemCount} items`}
                        </h2>
                        <div className='mt-5'>
                            <OrderItemsList items={order.orderItems} />
                        </div>
                    </section>
                </div>

                <aside className='space-y-6 lg:sticky lg:top-28 lg:self-start'>
                    {shipTo && (
                        <div className='border border-line bg-surface p-6'>
                            <p className='eyebrow'>Delivering to</p>
                            <p className='mt-3 font-sans text-sm text-ink'>{shipTo}</p>
                        </div>
                    )}
                    <div className='border border-line bg-surface p-6'>
                        <p className='eyebrow'>Summary</p>
                        <dl className='mt-4 space-y-2 font-sans text-sm'>
                            <div className='flex justify-between'><dt className='text-ink-soft'>Subtotal</dt><dd>{inr(order.itemsPrice)}</dd></div>
                            <div className='flex justify-between'><dt className='text-ink-soft'>Shipping</dt><dd>{order.shippingPrice ? inr(order.shippingPrice) : 'Free'}</dd></div>
                            {order.discountedAmount > 0 && (
                                <div className='flex justify-between'><dt className='text-ink-soft'>Discount</dt><dd>−{inr(order.discountedAmount)}</dd></div>
                            )}
                            <div className='flex justify-between border-t border-line pt-3 text-base'><dt>Total paid</dt><dd>{inr(order.totalPrice)}</dd></div>
                        </dl>
                    </div>
                    {order.isGuest && (
                        <div className='border border-line bg-surface p-6'>
                            <p className='eyebrow'>Placed as a guest</p>
                            {isAuthenticated ? (
                                <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                                    If you ordered with this account’s email, it’s in <Link to='/orders' className='text-brass underline-offset-4 hover:underline'>My Orders</Link> now.
                                </p>
                            ) : (
                                <>
                                    <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                                        Create an account with the email you ordered with. Once it’s verified, this order joins
                                        your account, and returns can be started from there.
                                    </p>
                                    <Link to={claimSignupPath('')} className='btn-outline mt-4 inline-block'>Create an account</Link>
                                </>
                            )}
                        </div>
                    )}
                    <p className='font-sans text-sm text-ink-soft'>
                        Questions about this order? <Link to='/contact-us' className='text-brass underline-offset-4 hover:underline'>Contact us</Link> with the order number.
                    </p>
                </aside>
            </div>
        </div>
    );
};

const TrackOrder = () => {
    const { id } = useParams();
    const [params] = useSearchParams();
    const location = useLocation();
    const token = params.get('t');
    // The order the lookup form just fetched, if it's this one. On /track (no
    // id) both sides are undefined, so check there is an order first.
    const stateOrder = location.state?.order;
    const fromLookup = id && stateOrder?._id === id ? stateOrder : null;

    const [order, setOrder] = useState(fromLookup);
    const [failed, setFailed] = useState('');

    useEffect(() => {
        if (!id) return undefined;
        if (!token) {
            setFailed('Look up your order with its number and email.');
            return undefined;
        }
        let active = true;
        setFailed('');
        axios.get(`/api/v1/order/track/${encodeURIComponent(id)}`, { headers: { 'X-Order-Token': token } })
            .then(({ data }) => active && setOrder(data.order))
            .catch(err => active && setFailed(err.response?.data?.message || 'We couldn’t load this order.'));
        return () => {
            active = false;
        };
    }, [id, token]);

    if (!id) {
        return (
            <Fragment>
                <MetaData title='Track your order · Maison' />
                <LookupForm />
            </Fragment>
        );
    }

    if (failed && !order) {
        return (
            <Fragment>
                <MetaData title='Track your order · Maison' noIndex />
                <LookupForm initialOrderId={id} notice={failed} />
            </Fragment>
        );
    }

    if (!order) return <Loader label='Finding your order' />;

    return (
        <Fragment>
            <MetaData title={`Order ${order._id} · Tracking · Maison`} noIndex />
            <TrackedOrder order={order} />
        </Fragment>
    );
};

export default TrackOrder;

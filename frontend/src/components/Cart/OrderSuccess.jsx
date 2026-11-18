import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { clearCart } from '../../actions/cartAction';
import MetaData from '../layout/MetaData';
import { claimSignupPath, getLastGuestOrder, trackingPath } from '../../utils/guestCheckout';
import { getReceipt } from '../../utils/orderReceipt';
import { estimatedDeliveryLabel } from '../../utils/delivery';
import { formatINR } from '../../utils/priceLabel';

const NEXT_STEPS = [
    { title: 'Order confirmed', body: 'Your confirmation and invoice are on their way to your inbox.' },
    { title: 'Packed with care', body: 'We prepare your pieces for dispatch.' },
    { title: 'Shipped', body: 'You get an email as soon as it leaves us, and can follow it from the order page.' },
    { title: 'Delivered', body: 'Not quite right? You can start a return from the order page after delivery.' },
];

const deliveryLabel = receipt => {
    if (!receipt?.estimatedDeliveryDate) return estimatedDeliveryLabel(receipt?.placedAt ? new Date(receipt.placedAt) : new Date());
    return new Date(receipt.estimatedDeliveryDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const Summary = ({ receipt }) => {
    const count = receipt.items.reduce((n, item) => n + Number(item.quantity || 0), 0);
    return (
        <section className='border border-line bg-surface p-5 sm:p-6' aria-labelledby='summary-title'>
            <div className='flex items-baseline justify-between gap-3'>
                <h2 id='summary-title' className='eyebrow'>Your order</h2>
                <p className='font-sans text-xs text-ink-faint'>{count} {count === 1 ? 'piece' : 'pieces'}</p>
            </div>
            <ul className='mt-4 divide-y divide-line'>
                {receipt.items.map((item, i) => (
                    <li key={`${item.product}-${i}`} className='flex gap-3 py-4 sm:gap-4'>
                        {item.image
                            ? <img src={item.image} alt='' loading='lazy' className='h-[4.5rem] w-14 shrink-0 bg-surface-2 object-cover sm:h-20 sm:w-16' />
                            : <span className='h-[4.5rem] w-14 shrink-0 bg-surface-2 sm:h-20 sm:w-16' />}
                        <div className='min-w-0 flex-1'>
                            <p className='font-display text-base leading-snug text-ink sm:text-lg'>{item.name}</p>
                            {item.variantLabel && <p className='mt-0.5 font-sans text-xs text-ink-soft'>{item.variantLabel}</p>}
                            <p className='mt-1 font-sans text-xs text-ink-faint'>Qty {item.quantity}</p>
                        </div>
                        <p className='shrink-0 font-sans text-sm text-ink'>{formatINR(item.price * item.quantity)}</p>
                    </li>
                ))}
            </ul>
            <dl className='space-y-2 border-t border-line pt-4 font-sans text-sm'>
                {receipt.itemsPrice != null && (
                    <div className='flex justify-between text-ink-soft'><dt>Subtotal</dt><dd>{formatINR(receipt.itemsPrice)}</dd></div>
                )}
                {receipt.discountedAmount > 0 && (
                    <div className='flex justify-between text-success'><dt>Discount</dt><dd>−{formatINR(receipt.discountedAmount)}</dd></div>
                )}
                {receipt.shippingPrice != null && (
                    <div className='flex justify-between text-ink-soft'><dt>Shipping</dt><dd>{receipt.shippingPrice ? formatINR(receipt.shippingPrice) : 'Complimentary'}</dd></div>
                )}
                <div className='flex justify-between pt-1 font-medium text-ink'><dt>Paid</dt><dd>{formatINR(receipt.totalPrice)}</dd></div>
            </dl>
        </section>
    );
};

const NextSteps = () => (
    <section aria-labelledby='next-title'>
        <h2 id='next-title' className='eyebrow'>What happens next</h2>
        <ol className='mt-5'>
            {NEXT_STEPS.map((step, i) => (
                <li key={step.title} className='relative flex gap-4 pb-6 last:pb-0'>
                    {i < NEXT_STEPS.length - 1 && <span aria-hidden='true' className='absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-line' />}
                    <span
                        aria-hidden='true'
                        className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full border font-sans text-[0.65rem] ${
                            i === 0 ? 'border-brass bg-brass text-canvas' : 'border-line bg-surface text-ink-faint'
                        }`}
                    >
                        {i === 0 ? '✓' : i + 1}
                    </span>
                    <div className='-mt-0.5'>
                        <p className={`font-sans text-sm ${i === 0 ? 'text-ink' : 'text-ink-soft'}`}>{step.title}</p>
                        <p className='mt-0.5 font-sans text-xs leading-relaxed text-ink-faint'>{step.body}</p>
                    </div>
                </li>
            ))}
        </ol>
    </section>
);

const OrderSuccess = () => {
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector(state => state.user);
    // Set by the payment step after a guest order.
    const [guestOrder] = useState(() => (isAuthenticated ? null : getLastGuestOrder()));
    const [receipt] = useState(getReceipt);

    useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    const orderId = receipt?.id || guestOrder?.id;
    const orderLink = guestOrder ? trackingPath(guestOrder.id, guestOrder.token) : orderId ? `/order/${orderId}` : '/orders';
    const address = receipt?.shippingInfo;

    return (
        <div className='editorial-shell py-14 sm:py-20'>
            <MetaData title='Order Placed · Maison' noIndex />

            <div className='text-center'>
                <CheckCircleOutlineIcon sx={{ fontSize: 64, color: '#A07C4B' }} />
                <p className='eyebrow mt-6'>Thank you</p>
                <h1 className='heading-display mt-3 text-display'>Your order has been placed</h1>
                <p className='mx-auto mt-4 max-w-md font-sans text-ink-soft'>
                    {orderId && <>Order <span className='break-all text-ink'>{orderId}</span>. </>}
                    {guestOrder
                        ? <>We’ve emailed the confirmation, invoice and a tracking link to <span className='text-ink [overflow-wrap:anywhere]'>{guestOrder.email}</span>.</>
                        : <>A confirmation and invoice are on their way to your inbox.</>}
                </p>
            </div>

            {/* Phones: delivery, then the order, then next steps. Desktop: the
                order on the left, the rest beside it. */}
            <div className='mx-auto mt-12 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-x-14 lg:gap-y-8'>
                <div className='grid gap-6 border-y border-line py-6 sm:grid-cols-2 lg:col-start-2 lg:row-start-1 lg:grid-cols-1'>
                    <div>
                        <p className='eyebrow'>Arriving by</p>
                        <p className='mt-2 font-display text-2xl text-ink'>{deliveryLabel(receipt)}</p>
                    </div>
                    {address?.address && (
                        <div>
                            <p className='eyebrow'>Delivering to</p>
                            <p className='mt-2 font-sans text-sm leading-relaxed text-ink-soft'>
                                {address.address}<br />
                                {[address.city, address.state].filter(Boolean).join(', ')}{address.pinCode ? ` ${address.pinCode}` : ''}
                            </p>
                        </div>
                    )}
                </div>

                <div className='lg:col-start-1 lg:row-span-2 lg:row-start-1'>
                    {receipt?.items?.length > 0 ? (
                        <Summary receipt={receipt} />
                    ) : (
                        <p className='border border-line bg-surface p-6 font-sans text-sm text-ink-soft'>
                            The full details of this order are in your confirmation email and under {guestOrder ? 'its tracking page' : 'My Orders'}.
                        </p>
                    )}
                </div>

                <div className='space-y-8 lg:col-start-2'>
                    <NextSteps />

                    <div className='flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row'>
                        <Link to={orderLink} className='btn-solid flex-1 text-center'>{guestOrder ? 'Track this order' : 'View order'}</Link>
                        <Link to='/products' className='btn-outline flex-1 text-center'>Continue shopping</Link>
                    </div>

                    {guestOrder && (
                        <div className='border border-line bg-surface p-6'>
                            <p className='font-display text-xl text-ink'>Keep this order in an account</p>
                            <p className='mt-2 font-sans text-sm leading-relaxed text-ink-soft'>
                                Create an account with {guestOrder.email}. Once you verify the email, this order and any
                                other guest orders you placed with it appear under My Orders, ready for returns.
                            </p>
                            <Link to={claimSignupPath(guestOrder.email)} className='btn-outline mt-5 inline-block'>Create an account</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;

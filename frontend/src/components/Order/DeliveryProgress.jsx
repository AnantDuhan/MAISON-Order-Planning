import React from 'react';
import { Link } from 'react-router-dom';

/*
 * Where an order is on its way to the customer: a headline, the expected
 * date, and a four-step progress line. Used on the signed-in order page and
 * the public tracking page, so both always agree.
 *
 * Works from either a full order or the trimmed tracking view the public
 * endpoint returns (deliveredAt instead of DeliveredAt).
 */

// Courier statuses that mean "something went wrong" rather than progress.
const PROBLEM_STATUSES = ['Delivery attempted', 'Delayed', 'Returning to sender'];

const formatDate = value => (value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '');

const formatShortDate = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const firstEvent = (events, status) => events.find(event => event.status === status)?.at;

/** The steps, headline and late flag for an order. Exported for tests and other views. */
export const deliveryState = order => {
    const events = [...(order?.shipment?.events || [])].sort((a, b) => new Date(a.at) - new Date(b.at));
    const deliveredAt = order?.DeliveredAt || order?.deliveredAt || firstEvent(events, 'Delivered');
    const isDelivered = order?.orderStatus === 'Delivered' || Boolean(deliveredAt);
    const isShipped = isDelivered || order?.orderStatus === 'Shipped';
    const shippedAt = order?.shipment?.shippedAt || firstEvent(events, 'Shipped');
    const outAt = firstEvent(events, 'Out for delivery');
    const lastStatus = order?.shipment?.lastStatus;

    const steps = [
        { label: 'Placed', done: Boolean(order?._id), date: order?.createdAt || order?.paidAt },
        { label: 'Shipped', done: isShipped, date: shippedAt },
        { label: 'Out for delivery', done: isDelivered || Boolean(outAt), date: outAt },
        { label: 'Delivered', done: isDelivered, date: deliveredAt },
    ];
    const current = steps.reduce((last, step, index) => (step.done ? index : last), 0);

    const problem = !isDelivered && PROBLEM_STATUSES.includes(lastStatus) ? lastStatus : null;
    const headline = order?.isRefunded ? 'This order was refunded'
        : isDelivered ? `Delivered ${formatDate(deliveredAt)}`
            : problem || (lastStatus && lastStatus !== 'Shipped' ? lastStatus
                : isShipped ? 'On its way to you'
                    : 'We’re preparing your order');

    // An estimate in the past on an undelivered order is a late order: say so.
    const isLate = !isDelivered && !order?.isRefunded && Boolean(order?.estimatedDeliveryDate)
        && new Date(order.estimatedDeliveryDate).setHours(23, 59, 59, 999) < Date.now();
    const detail = !isDelivered && !order?.isRefunded && order?.estimatedDeliveryDate
        ? isLate
            ? `Running late — it was expected by ${formatDate(order.estimatedDeliveryDate)}. Sorry for the wait.`
            : `Expected by ${formatDate(order.estimatedDeliveryDate)}`
        : null;

    return { steps, current, headline, detail, isLate, problem, isDelivered };
};

const DeliveryProgress = ({ order }) => {
    const { steps, current, headline, detail, isLate, problem } = deliveryState(order);

    return (
        <section aria-label='Delivery progress' className='border border-line bg-surface p-6 sm:p-8'>
            <p className={`font-display text-2xl ${problem ? 'text-danger' : 'text-ink'}`}>{headline}</p>
            {detail && (
                <p className={`mt-1 font-sans text-sm ${isLate ? 'text-brass' : 'text-ink-soft'}`}>{detail}</p>
            )}
            {(isLate || problem) && (
                <Link to='/contact-us' className='mt-2 inline-block font-sans text-sm text-ink-soft underline-offset-4 hover:text-brass hover:underline'>
                    Ask us about this order
                </Link>
            )}
            <ol className='mt-8 grid grid-cols-4'>
                {steps.map((step, index) => (
                    <li key={step.label} className='relative' aria-current={index === current ? 'step' : undefined}>
                        {index > 0 && (
                            <span
                                aria-hidden='true'
                                className={`absolute right-1/2 top-[7px] h-px w-full ${step.done ? 'bg-brass' : 'bg-line'}`}
                            />
                        )}
                        <div className='relative flex flex-col items-center text-center'>
                            <span
                                className={`h-[15px] w-[15px] rounded-full border-2 ${step.done ? 'border-brass bg-brass' : 'border-line bg-surface'} ${index === current && !steps[steps.length - 1].done ? 'ring-4 ring-brass/20' : ''}`}
                            />
                            <span className={`mt-3 font-sans text-xs sm:text-sm ${step.done ? 'text-ink' : 'text-ink-faint'}`}>
                                {step.label}
                            </span>
                            <span className='mt-1 font-sans text-xs text-ink-faint'>
                                {step.date && step.done ? formatShortDate(step.date) : ' '}
                            </span>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
};

export default DeliveryProgress;

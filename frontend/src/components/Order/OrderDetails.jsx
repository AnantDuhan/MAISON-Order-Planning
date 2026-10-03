import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';


import { clearErrors, getOrderDetails, returnRequest, reorder } from '../../actions/orderAction';
import TrackingTimeline from './TrackingTimeline';
import OrderItemsList, { inr } from './OrderItemsList';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    MenuItem,
    Select,
} from '@mui/material';
import LoadingBar from 'react-top-loading-bar';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';

const formatDate = value => (value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '');

const formatShortDate = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const OrderDetails = () => {
    const { order, error, loading } = useSelector(state => state.orderDetails);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    const [reordering, setReordering] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedReturnReason, setSelectedReturnReason] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const returnReasons = [
        'Defective Product',
        'Wrong Product Shipped',
        'Received Incomplete Order',
        "Product Doesn't Match Description",
        'Size Does Not Fit',
        "Color Doesn't Match",
        'Changed My Mind',
        'Item Arrived Late',
        'Ordered by Mistake',
        'Unsatisfactory Quality',
        'Received Damaged Product',
        'Ordered Duplicate Product',
        'Product Expired/Short Expiry Date',
        'Not Satisfied with Performance',
        "Item Doesn't Meet Expectations",
    ];

    const submitReturnRequest = (orders, reason) => {
        if (orders && reason) {
            dispatch(returnRequest(order._id, reason));
            toast.success('Return request submitted successfully');
            handleCloseDialog();
        }
        setProgress(progress + 80);
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
        setSelectedOrder(order);
        setSelectedReturnReason(order.returnReason || returnReasons[0]);
    };

    const handleCloseDialog = () => setOpenDialog(false);

    const handleReorder = async () => {
        try {
            setReordering(true);
            const result = await dispatch(reorder(order._id));
            if (!result?.items?.length) {
                toast.info('None of these items are currently in stock.');
                return;
            }
            if (result.unavailable?.length) {
                toast.info(`${result.unavailable.length} item(s) are out of stock and were skipped.`);
            }
            toast.success('Items added to your cart');
            navigate('/cart');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Reorder failed. Please try again.');
        } finally {
            setReordering(false);
        }
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(getOrderDetails(id));
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, id]);

    // Live order-status updates: join this order's room and refetch when the
    // admin advances the status, so the page reflects Processing -> Shipped ->
    // Delivered without a manual refresh.
    useEffect(() => {
        // Same origin by default (Vite proxies /socket.io to the local backend in dev).
        const socket = io(import.meta.env.REACT_APP_SOCKET_URL || undefined);
        const room = `order:${id}`;
        socket.emit('joinRoom', room);

        const onStatus = ({ orderStatus, shipment }) => {
            toast.info(`Order update: ${shipment?.lastStatus || orderStatus}`);
            dispatch(getOrderDetails(id));
        };
        socket.on('orderStatusUpdate', onStatus);

        return () => {
            socket.emit('leaveRoom', room);
            socket.off('orderStatusUpdate', onStatus);
            socket.disconnect();
        };
    }, [dispatch, id]);

    // Cashfree orders are stored as 'PAID'; 'succeeded' covers legacy orders.
    const isPaid = ['PAID', 'succeeded'].includes(order?.paymentInfo?.status);
    const isDelivered = order?.orderStatus === 'Delivered';
    const placedAt = order?.createdAt || order?.paidAt;
    const itemCount = (order?.orderItems || []).reduce((n, item) => n + (item.quantity || 0), 0);
    const shippedAt = order?.shipment?.shippedAt
        || order?.shipment?.events?.find(event => event.status === 'Shipped')?.at;
    const isShipped = ['Shipped', 'Delivered'].includes(order?.orderStatus);

    const steps = [
        { label: 'Placed', done: Boolean(order?._id), date: placedAt },
        { label: 'Shipped', done: isShipped, date: shippedAt },
        { label: 'Delivered', done: isDelivered, date: order?.DeliveredAt },
    ];

    const statusLabel = order?.isRefunded ? 'Refunded'
        : order?.isReturned ? 'Return requested'
            : order?.orderStatus || '';
    const statusTone = isDelivered && !order?.isRefunded
        ? { badge: 'border-success/40 text-success', dot: 'bg-success' }
        : order?.isRefunded || order?.isReturned
            ? { badge: 'border-line text-ink-soft', dot: 'bg-ink-faint' }
            : { badge: 'border-brass/40 text-brass', dot: 'bg-brass' };

    const lastEvent = order?.shipment?.lastStatus;
    const progressHeadline = order?.isRefunded ? 'This order was refunded'
        : isDelivered ? `Delivered ${formatDate(order?.DeliveredAt)}`
            : lastEvent && lastEvent !== 'Shipped' ? lastEvent
                : isShipped ? 'On its way to you'
                    : 'We’re preparing your order';
    const progressDetail = !isDelivered && !order?.isRefunded && order?.estimatedDeliveryDate
        ? `Expected by ${formatDate(order.estimatedDeliveryDate)}`
        : null;

    const paymentMethod = order?.paymentInfo?.provider === 'wallet'
        ? 'with store credit'
        : order?.storeCreditApplied > 0 ? 'online and with store credit' : 'online';

    const canReturn = isDelivered && !order?.isReturned && !order?.isRefunded;
    const returnNote = order?.isRefunded ? 'This order has been refunded.'
        : order?.isReturned ? 'You’ve requested a return. We’ll email you with the next steps.'
            : isDelivered ? 'Returns are accepted for delivered orders.'
                : 'You can request a return once the order has been delivered.';
    return (
        <Fragment>
            {loading ? (
                <Fragment>
                    <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
                    <Loader label='Finding your order' />
                </Fragment>
            ) : (
                <Fragment>
                    <MetaData title='Order Details · Maison' />

                    <div className='editorial-shell py-14'>
                        {/* Header: what this order is, where it stands, what you can do */}
                        <header className='flex flex-col gap-6 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between'>
                            <div>
                                <Link to='/orders' className='font-sans text-sm text-ink-soft hover:text-brass'>
                                    ← All orders
                                </Link>
                                <h1 className='heading-display mt-4 break-all text-4xl sm:text-5xl'>Order {order._id}</h1>
                                <p className='mt-3 font-sans text-sm text-ink-soft'>
                                    Placed {formatDate(placedAt)} · {itemCount} {itemCount === 1 ? 'item' : 'items'} · {inr(order.totalPrice)}
                                </p>
                            </div>
                            <div className='flex flex-wrap items-center gap-3'>
                                <span className={`inline-flex items-center gap-2 border px-4 py-2 font-sans text-sm ${statusTone.badge}`}>
                                    <span className={`h-2 w-2 rounded-full ${statusTone.dot}`} />
                                    {statusLabel}
                                </span>
                                {isPaid && (
                                    <a href={`/api/v1/order/${order._id}/invoice`} download className='btn-outline'>
                                        Invoice
                                    </a>
                                )}
                                <button onClick={handleReorder} disabled={reordering} className='btn-solid disabled:opacity-60'>
                                    {reordering ? 'Adding to bag…' : 'Buy again'}
                                </button>
                            </div>
                        </header>

                        <div className='mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]'>
                            {/* Main column */}
                            <div className='space-y-12'>
                                {/* Progress */}
                                <section aria-label='Delivery progress' className='border border-line bg-surface p-6 sm:p-8'>
                                    <p className='font-display text-2xl text-ink'>{progressHeadline}</p>
                                    {progressDetail && (
                                        <p className='mt-1 font-sans text-sm text-ink-soft'>{progressDetail}</p>
                                    )}
                                    <ol className='mt-8 grid grid-cols-3'>
                                        {steps.map((step, index) => (
                                            <li key={step.label} className='relative'>
                                                {index > 0 && (
                                                    <span
                                                        aria-hidden='true'
                                                        className={`absolute right-1/2 top-[7px] h-px w-full ${step.done ? 'bg-brass' : 'bg-line'}`}
                                                    />
                                                )}
                                                <div className='relative flex flex-col items-center text-center'>
                                                    <span
                                                        className={`h-[15px] w-[15px] rounded-full border-2 ${step.done ? 'border-brass bg-brass' : 'border-line bg-surface'}`}
                                                    />
                                                    <span className={`mt-3 font-sans text-sm ${step.done ? 'text-ink' : 'text-ink-faint'}`}>
                                                        {step.label}
                                                    </span>
                                                    <span className='mt-1 font-sans text-xs text-ink-faint'>
                                                        {step.date ? formatShortDate(step.date) : '\u00a0'}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </section>

                                {/* Items */}
                                <section aria-labelledby='items-heading'>
                                    <h2 id='items-heading' className='font-display text-2xl text-ink'>
                                        {itemCount === 1 ? 'Your item' : `Your ${itemCount} items`}
                                    </h2>
                                    <div className='mt-5'>
                                        <OrderItemsList items={order.orderItems} />
                                    </div>
                                </section>

                                {/* Tracking */}
                                {order.shipment?.events?.length > 0 && (
                                    <section aria-label='Tracking'>
                                        <TrackingTimeline shipment={order.shipment} />
                                    </section>
                                )}

                                {/* Price breakdown */}
                                <section aria-labelledby='summary-heading' className='border border-line bg-surface p-6 sm:p-8'>
                                    <h2 id='summary-heading' className='font-display text-2xl text-ink'>Order summary</h2>
                                    <dl className='mt-6 space-y-3 font-sans text-sm'>
                                        <div className='flex justify-between'>
                                            <dt className='text-ink-soft'>Subtotal</dt>
                                            <dd className='text-ink'>{inr(order.itemsPrice)}</dd>
                                        </div>
                                        <div className='flex justify-between'>
                                            <dt className='text-ink-soft'>Shipping</dt>
                                            <dd className='text-ink'>{order.shippingPrice ? inr(order.shippingPrice) : 'Free'}</dd>
                                        </div>
                                        {order.discountedAmount > 0 && (
                                            <div className='flex justify-between'>
                                                <dt className='text-ink-soft'>
                                                    Discount{order.couponCode ? ` (${order.couponCode})` : ''}
                                                </dt>
                                                <dd className='text-success'>−{inr(order.discountedAmount)}</dd>
                                            </div>
                                        )}
                                        {order.storeCreditApplied > 0 && (
                                            <div className='flex justify-between'>
                                                <dt className='text-ink-soft'>Paid with store credit</dt>
                                                <dd className='text-ink'>−{inr(order.storeCreditApplied)}</dd>
                                            </div>
                                        )}
                                        <div className='flex items-baseline justify-between border-t border-line pt-4'>
                                            <dt className='text-ink'>{order.storeCreditApplied > 0 ? 'Paid online' : 'Total'}</dt>
                                            <dd className='font-display text-3xl text-ink'>
                                                {inr(order.totalPrice - (order.storeCreditApplied || 0))}
                                            </dd>
                                        </div>
                                    </dl>
                                </section>
                            </div>

                            {/* Side rail */}
                            <aside className='space-y-6 lg:sticky lg:top-28 lg:self-start'>
                                <section className='border border-line bg-surface p-6'>
                                    <h2 className='font-display text-xl text-ink'>Delivering to</h2>
                                    <address className='mt-4 font-sans text-sm not-italic leading-relaxed text-ink-soft'>
                                        <span className='block text-ink'>{order.user?.name}</span>
                                        {order.shippingInfo?.address}
                                        <br />
                                        {order.shippingInfo?.city}, {order.shippingInfo?.state} {order.shippingInfo?.pinCode}
                                        <br />
                                        {order.shippingInfo?.country}
                                        {order.shippingInfo?.phoneNumber && (
                                            <span className='mt-2 block'>Phone {order.shippingInfo.phoneNumber}</span>
                                        )}
                                    </address>
                                </section>

                                <section className='border border-line bg-surface p-6'>
                                    <h2 className='font-display text-xl text-ink'>Payment</h2>
                                    <p className={`mt-4 font-sans text-sm ${isPaid ? 'text-success' : 'text-danger'}`}>
                                        {isPaid ? `Paid ${paymentMethod}` : 'Payment pending'}
                                    </p>
                                    {order.paidAt && (
                                        <p className='mt-1 font-sans text-xs text-ink-faint'>{formatDate(order.paidAt)}</p>
                                    )}
                                    {(isPaid || order.isRefunded) && (
                                        <div className='mt-5 flex flex-wrap gap-x-6 gap-y-2'>
                                            {isPaid && (
                                                <a href={`/api/v1/order/${order._id}/invoice`} download className='font-sans text-sm text-brass underline-offset-4 hover:underline'>
                                                    Download invoice
                                                </a>
                                            )}
                                            {order.isRefunded && (
                                                <a href={`/api/v1/order/${order._id}/credit-note`} download className='font-sans text-sm text-brass underline-offset-4 hover:underline'>
                                                    Download credit note
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className='border border-line bg-surface p-6'>
                                    <h2 className='font-display text-xl text-ink'>Something not right?</h2>
                                    <button
                                        onClick={handleOpenDialog}
                                        disabled={!canReturn}
                                        className='btn-outline mt-5 w-full disabled:opacity-50'
                                    >
                                        Request a return
                                    </button>
                                    <p className='mt-3 font-sans text-xs leading-relaxed text-ink-faint'>{returnNote}</p>
                                    <Link to='/contact-us' className='mt-4 inline-block font-sans text-sm text-ink-soft hover:text-brass'>
                                        Contact us about this order
                                    </Link>
                                </section>
                            </aside>
                        </div>
                    </div>

                    {/* Return dialog */}
                    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth='sm' fullWidth>
                        <DialogTitle sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem' }}>
                            Request a Return
                        </DialogTitle>
                        <DialogContent>
                            {order && order.orderItems ? (
                                <div>
                                    <p style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A07C4B' }}>
                                        Order {order._id}
                                    </p>
                                    <div className='mt-4 flex gap-4 overflow-x-auto pb-2'>
                                        {order.orderItems.map(item => (
                                            <div key={item._id} className='w-32 shrink-0'>
                                                <img
                                                    src={item.images?.[0]?.url || item.image}
                                                    alt={item.name}
                                                    className='aspect-square w-full border object-cover'
                                                />
                                                <p className='mt-2 text-sm'>{item.name}</p>
                                                <p className='text-xs opacity-70'>Qty: {item.quantity}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className='mt-4 text-sm'>Amount: ₹{order.totalPrice}</p>
                                </div>
                            ) : null}

                            <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A07C4B' }}>
                                Reason for return
                            </p>
                            <FormControl fullWidth sx={{ mt: 1.5 }}>
                                <Select
                                    value={selectedReturnReason}
                                    onChange={event => setSelectedReturnReason(event.target.value)}
                                >
                                    {returnReasons.map(reason => (
                                        <MenuItem key={reason} value={reason}>{reason}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDialog} sx={{ color: '#8A8278' }}>Cancel</Button>
                            <Button
                                onClick={() => submitReturnRequest(selectedOrder, selectedReturnReason)}
                                sx={{ color: '#A07C4B' }}
                            >
                                Submit Return
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Fragment>
            )}
        </Fragment>
    );
};

export default OrderDetails;

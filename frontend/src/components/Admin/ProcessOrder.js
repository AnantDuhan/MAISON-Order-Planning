import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
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

import { UPDATE_ORDER_RESET } from '../../constants/orderConstants';
import {
    clearErrors,
    getOrderDetails,
    initiateRefund,
    updateOrder,
    updateRefundStatus,
} from '../../actions/orderAction';
import MetaData from '../layout/MetaData';

const refundOptions = ['Processing', 'Rejected', 'Pending', 'Approve', 'Refunded'];

/** Shared summary shown inside both refund dialogs. */
const OrderSummary = ({ order }) => {
    if (!order || !order.orderItems) {
        return <p className='font-sans text-sm opacity-70'>Loading order…</p>;
    }
    return (
        <div>
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A07C4B' }}>
                Order {order._id}
            </p>
            <div className='mt-4 flex gap-4 overflow-x-auto pb-2'>
                {order.orderItems.map(item => (
                    <div key={item._id} className='w-32 shrink-0'>
                        <img
                            src={item.image}
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
    );
};

const ProcessOrder = () => {
    const { order, error, loading } = useSelector(state => state.orderDetails);
    const { error: updateError, isUpdated } = useSelector(state => state.order);

    const dispatch = useDispatch();
    const { id } = useParams();

    // Separate state per dialog — sharing one flag opened both at once.
    const [initiateOpen, setInitiateOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [selectedRefundStatus, setSelectedRefundStatus] = useState('');
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const submitInitiateRefund = () => {
        if (order) {
            setProgress(50);
            dispatch(initiateRefund(id));
            toast.success('Refund request initiated successfully');
            setInitiateOpen(false);
        }
    };

    const submitApproveRefund = () => {
        if (order) {
            dispatch(updateRefundStatus(order?._id, order?.refund?.[0], selectedRefundStatus));
            toast.success('Refund status updated successfully');
            setApproveOpen(false);
        }
    };

    const openApproveDialog = () => {
        setSelectedRefundStatus(refundOptions[4]);
        setApproveOpen(true);
    };

    const updateOrderSubmitHandler = e => {
        e.preventDefault();
        dispatch(updateOrder(id, status));
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (updateError) {
            toast.error(updateError);
            dispatch(clearErrors());
        }
        if (isUpdated) {
            toast.success('Order Updated Successfully');
            dispatch({ type: UPDATE_ORDER_RESET });
        }
        dispatch(getOrderDetails(id));
        setProgress(100);
        setTimeout(() => setProgress(0), 1000);
    }, [dispatch, error, id, updateError, isUpdated]);

    const isPaid = order?.paymentInfo?.status === 'succeeded';
    const isDelivered = order?.orderStatus === 'Delivered';
    const address = order?.shippingInfo
        ? `${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state}, ${order.shippingInfo.pinCode}, ${order.shippingInfo.country}`
        : '';

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Process Order · Admin' />

                    <div className='editorial-shell py-12'>
                        <div className='mb-10'>
                            <p className='eyebrow'>Admin · Process Order</p>
                            <h1 className='heading-display mt-2 break-all text-4xl'>
                                #{order && order._id}
                            </h1>
                        </div>

                        <div className='grid gap-14 lg:grid-cols-[1fr_380px]'>
                            {/* Items + processing form */}
                            <div>
                                <p className='eyebrow'>Order Items</p>
                                <div className='mt-5 divide-y divide-line border border-line bg-surface'>
                                    {order.orderItems &&
                                        order.orderItems.map(item => (
                                            <div key={item.product} className='flex flex-col gap-5 p-6 sm:flex-row'>
                                                <div className='w-full shrink-0 overflow-hidden border border-line bg-surface-2 sm:w-32'>
                                                    <img
                                                        src={item.image}
                                                        alt='Product'
                                                        className='aspect-square w-full object-cover'
                                                    />
                                                </div>
                                                <div className='flex flex-1 flex-col justify-center'>
                                                    <Link
                                                        to={`/product/${item.product}`}
                                                        className='font-display text-xl font-medium text-ink hover:text-brass'
                                                    >
                                                        {item.name}
                                                    </Link>
                                                    <div className='mt-3 space-y-1 font-sans text-sm text-ink-soft'>
                                                        <p>Quantity: {item.quantity}</p>
                                                        <p>Price: ₹{item.price}</p>
                                                        <p className='text-ink'>
                                                            Total: <b>₹{item.price * item.quantity}</b>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {!isDelivered && (
                                    <form
                                        onSubmit={updateOrderSubmitHandler}
                                        className='mt-10 border border-line bg-surface p-6'
                                    >
                                        <p className='eyebrow'>Advance Order Status</p>
                                        <div className='mt-5 flex flex-col gap-4 sm:flex-row sm:items-end'>
                                            <div className='field-row flex-1'>
                                                <AccountTreeIcon />
                                                <select value={status} onChange={e => setStatus(e.target.value)}>
                                                    <option value=''>Choose Status</option>
                                                    {order.orderStatus === 'Processing' && (
                                                        <option value='Shipped'>Shipped</option>
                                                    )}
                                                    {order.orderStatus === 'Shipped' && (
                                                        <option value='Delivered'>Delivered</option>
                                                    )}
                                                </select>
                                            </div>
                                            <button
                                                type='submit'
                                                disabled={loading || status === ''}
                                                onClick={() => setProgress(progress + 60)}
                                                className='btn-solid shrink-0 disabled:opacity-40'
                                            >
                                                Process
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Meta rail */}
                            <div className='space-y-8 lg:sticky lg:top-28 lg:self-start'>
                                <div className='border border-line bg-surface p-6'>
                                    <p className='eyebrow'>Shipping Info</p>
                                    <div className='mt-5 space-y-3'>
                                        <div className='flex justify-between gap-6'>
                                            <span className='font-sans text-sm text-ink-faint'>Name</span>
                                            <span className='text-right font-sans text-sm text-ink'>
                                                {order.user && order.user.name}
                                            </span>
                                        </div>
                                        <div className='flex justify-between gap-6'>
                                            <span className='font-sans text-sm text-ink-faint'>Phone</span>
                                            <span className='text-right font-sans text-sm text-ink'>
                                                {order.shippingInfo && order.shippingInfo.phoneNumber}
                                            </span>
                                        </div>
                                        <div className='flex justify-between gap-6'>
                                            <span className='font-sans text-sm text-ink-faint'>Address</span>
                                            <span className='text-right font-sans text-sm text-ink'>{address}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className='border border-line bg-surface p-6'>
                                    <p className='eyebrow'>Payment</p>
                                    <div className='mt-5 flex items-center justify-between'>
                                        <span className={`font-sans text-[0.72rem] uppercase tracking-luxe ${isPaid ? 'text-success' : 'text-danger'}`}>
                                            {isPaid ? 'Paid' : 'Not Paid'}
                                        </span>
                                        <span className='font-display text-2xl font-medium text-ink'>
                                            ₹{order.totalPrice}
                                        </span>
                                    </div>
                                </div>

                                <div className='border border-line bg-surface p-6'>
                                    <p className='eyebrow'>Order Status</p>
                                    <div className='mt-5 flex items-center gap-2'>
                                        <span className={`h-2 w-2 rounded-full ${isDelivered ? 'bg-success' : 'bg-danger'}`} />
                                        <span className={`font-sans text-[0.72rem] uppercase tracking-luxe ${isDelivered ? 'text-success' : 'text-danger'}`}>
                                            {order.orderStatus}
                                        </span>
                                    </div>
                                </div>

                                <div className='flex flex-col gap-3'>
                                    <button
                                        onClick={() => setInitiateOpen(true)}
                                        disabled={order.isRefunded === true || order.isReturned === false}
                                        className='btn-outline w-full disabled:opacity-40'
                                    >
                                        Initiate Refund
                                    </button>
                                    <button
                                        onClick={openApproveDialog}
                                        disabled={order.isRefunded === false && order.isReturned === false}
                                        className='btn-solid w-full disabled:opacity-40'
                                    >
                                        Approve Refund
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Initiate refund */}
                    <Dialog open={initiateOpen} onClose={() => setInitiateOpen(false)} maxWidth='sm' fullWidth>
                        <DialogTitle sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem' }}>
                            Initiate Refund
                        </DialogTitle>
                        <DialogContent>
                            <OrderSummary order={order} />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setInitiateOpen(false)} sx={{ color: '#8A8278' }}>Cancel</Button>
                            <Button onClick={submitInitiateRefund} sx={{ color: '#A07C4B' }}>Initiate Refund</Button>
                        </DialogActions>
                    </Dialog>

                    {/* Approve refund */}
                    <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth='sm' fullWidth>
                        <DialogTitle sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem' }}>
                            Approve Refund
                        </DialogTitle>
                        <DialogContent>
                            <OrderSummary order={order} />
                            <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A07C4B' }}>
                                Update refund status
                            </p>
                            <FormControl fullWidth sx={{ mt: 1.5 }}>
                                <Select
                                    value={selectedRefundStatus}
                                    onChange={event => setSelectedRefundStatus(event.target.value)}
                                >
                                    {refundOptions.map(reason => (
                                        <MenuItem key={reason} value={reason}>{reason}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setApproveOpen(false)} sx={{ color: '#8A8278' }}>Cancel</Button>
                            <Button onClick={submitApproveRefund} sx={{ color: '#A07C4B' }}>Approve Refund</Button>
                        </DialogActions>
                    </Dialog>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ProcessOrder;

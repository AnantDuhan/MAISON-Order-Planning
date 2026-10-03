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
import Loader from '../layout/Loader/Loader';

import { UPDATE_ORDER_RESET } from '../../constants/orderConstants';
import {
    clearErrors,
    getOrderDetails,
    initiateRefund,
    updateOrder,
    updateRefundStatus,
} from '../../actions/orderAction';
import MetaData from '../layout/MetaData';
import ShipmentPanel, { ShipFields } from './ShipmentPanel';
import OrderItemsList from '../Order/OrderItemsList';
import { EntityHistory } from './AuditLog';
import { useFeature } from '../../context/FeatureFlagsContext';

const refundOptions = ['Initiated', 'Pending', 'Approved', 'Rejected', 'Refunded'];

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
    );
};

const ProcessOrder = () => {
    const { order: fetchedOrder, error, loading } = useSelector(state => state.orderDetails);
    const { error: updateError, isUpdated } = useSelector(state => state.order);

    const order = fetchedOrder || {};

    const dispatch = useDispatch();
    const { id } = useParams();

    // Separate state per dialog — sharing one flag opened both at once.
    const [initiateOpen, setInitiateOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [selectedRefundStatus, setSelectedRefundStatus] = useState('');
    const [refundMethod, setRefundMethod] = useState('original');
    const storeCreditOn = useFeature('storeCredit');
    const [status, setStatus] = useState('');
    const [shipDetails, setShipDetails] = useState({ courier: '', awb: '', trackingUrl: '' });
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const [refundBusy, setRefundBusy] = useState(false);

    // Wait for the server before saying anything: this used to report success
    // immediately (and hide any error) because the request wasn't awaited.
    const submitInitiateRefund = async () => {
        if (!order?._id || refundBusy) return;
        setRefundBusy(true);
        setProgress(50);
        try {
            await dispatch(initiateRefund(id));
            toast.success('Refund initiated. Approve it to send the money back.');
            setInitiateOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Could not initiate the refund');
        } finally {
            // Reload so the refund buttons and status reflect what the server has.
            dispatch(getOrderDetails(id));
            setRefundBusy(false);
            setProgress(100);
        }
    };

    const submitApproveRefund = async () => {
        const refund = order?.refund?.[0];
        const refundId = typeof refund === 'object' ? refund?._id : refund;

        if (order && refundId) {
            if (refundBusy) return;
            setRefundBusy(true);
            try {
                await dispatch(updateRefundStatus(order._id, refundId, selectedRefundStatus, refundMethod));
                toast.success(selectedRefundStatus === 'Refunded'
                    ? `Refunded ${refundMethod === 'store-credit' ? 'as store credit' : 'to the original payment method'}`
                    : `Refund status set to ${selectedRefundStatus}`);
                setApproveOpen(false);
            } catch (error) {
                toast.error(error.response?.data?.message || error.message || 'Could not update the refund');
            } finally {
                dispatch(getOrderDetails(id));
                setRefundBusy(false);
            }
        } else {
            toast.error('Initiate the refund before updating its status');
        }
    };

    const openApproveDialog = () => {
        setSelectedRefundStatus(refundOptions[4]);
        setApproveOpen(true);
    };

    const updateOrderSubmitHandler = e => {
        e.preventDefault();
        dispatch(updateOrder(id, status, status === 'Shipped' ? shipDetails : {}));
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

    // Cashfree orders are stored as 'PAID'; 'succeeded' covers legacy orders.
    const isPaid = ['PAID', 'succeeded'].includes(order?.paymentInfo?.status);
    const isDelivered = order?.orderStatus === 'Delivered';
    const address = order?.shippingInfo
        ? `${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state}, ${order.shippingInfo.pinCode}, ${order.shippingInfo.country}`
        : '';

    return (
        <Fragment>
            {loading ? (
                <Fragment>
                    <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
                    <Loader label='Finding the order' />
                </Fragment>
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
                                <div className='mt-5'>
                                    <OrderItemsList items={order.orderItems} />
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
                                        {status === 'Shipped' && (
                                            <ShipFields value={shipDetails} onChange={setShipDetails} />
                                        )}
                                    </form>
                                )}

                                {order._id && (
                                    <ShipmentPanel order={order} onChanged={() => dispatch(getOrderDetails(id))} />
                                )}

                                {order._id && (
                                    <div className='mt-10'>
                                        <EntityHistory entityType='order' entityId={order._id} key={`${order._id}-${order.orderStatus}-${order.shipment?.events?.length || 0}`} />
                                    </div>
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
                                        disabled={
                                            !isDelivered ||
                                            !order.return?.length ||
                                            order.isRefunded === true ||
                                            order.refundStatus === 'Processing'
                                        }
                                        className='btn-outline w-full disabled:opacity-40'
                                    >
                                        Initiate Refund
                                    </button>
                                    <p className='font-sans text-xs leading-relaxed text-ink-faint'>
                                        {order.isRefunded
                                            ? 'This order has been refunded.'
                                            : order.refund?.length
                                                ? `Refund ${String(order.refundStatus || 'initiated').toLowerCase()}. Use Approve Refund to complete it.`
                                                : !isDelivered
                                                    ? 'Refunds open once the order is delivered and the customer requests a return.'
                                                    : !order.return?.length
                                                        ? 'Waiting for the customer to request a return.'
                                                        : 'The customer requested a return. Initiate the refund to start it.'}
                                    </p>
                                    <button
                                        onClick={openApproveDialog}
                                        disabled={!order.refund?.length || order.isRefunded === true}
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
                            <Button onClick={submitInitiateRefund} disabled={refundBusy} sx={{ color: '#A07C4B' }}>
                                {refundBusy ? 'Initiating…' : 'Initiate Refund'}
                            </Button>
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
                            {selectedRefundStatus === 'Refunded' && (
                                <Fragment>
                                    <p style={{ marginTop: '1.5rem', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#A07C4B' }}>
                                        Refund to
                                    </p>
                                    <FormControl fullWidth sx={{ mt: 1.5 }}>
                                        <Select value={refundMethod} onChange={event => setRefundMethod(event.target.value)}>
                                            <MenuItem value='original'>Original payment method</MenuItem>
                                            <MenuItem value='store-credit' disabled={!storeCreditOn}>
                                                MAISON store credit (instant){storeCreditOn ? '' : ' — turned off in Features'}
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                    {order.storeCreditApplied > 0 && (
                                        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.75 }}>
                                            ₹{order.storeCreditApplied} of this order was paid with store credit and always goes back as store credit.
                                        </p>
                                    )}
                                </Fragment>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setApproveOpen(false)} sx={{ color: '#8A8278' }}>Cancel</Button>
                            <Button onClick={submitApproveRefund} disabled={refundBusy} sx={{ color: '#A07C4B' }}>
                                {refundBusy ? 'Saving…' : 'Approve Refund'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ProcessOrder;

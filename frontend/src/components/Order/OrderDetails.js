import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import { clearErrors, getOrderDetails, returnRequest } from '../../actions/orderAction';
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
import MetaData from '../layout/MetaData';

const OrderDetails = () => {
    const { order, error, loading } = useSelector(state => state.orderDetails);

    const dispatch = useDispatch();
    const { id } = useParams();

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

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(getOrderDetails(id));
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error, id]);

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
                    <MetaData title='Order Details · Maison' />

                    <div className='editorial-shell py-14'>
                        <div className='mb-12'>
                            <p className='eyebrow'>Order Record</p>
                            <h1 className='heading-display mt-3 break-all text-4xl'>
                                #{order && order._id}
                            </h1>
                        </div>

                        <div className='grid gap-14 lg:grid-cols-[1fr_380px]'>
                            {/* Left: items */}
                            <div>
                                <p className='eyebrow'>Order Items</p>
                                <div className='mt-5 divide-y divide-line border border-line bg-surface'>
                                    {order.orderItems &&
                                        order.orderItems.map(item => (
                                            <div key={item.product} className='flex flex-col gap-5 p-6 sm:flex-row'>
                                                <div className='w-full shrink-0 overflow-hidden border border-line bg-surface-2 sm:w-32'>
                                                    {item.images && item.images.length > 1 ? (
                                                        <Carousel showThumbs={false} showStatus={false}>
                                                            {item.images.map((img, index) => (
                                                                <div key={index}>
                                                                    <img
                                                                        src={img.url}
                                                                        alt={`Product ${index + 1}`}
                                                                        className='aspect-square w-full object-cover'
                                                                    />
                                                                </div>
                                                            ))}
                                                        </Carousel>
                                                    ) : (
                                                        <img
                                                            src={item.images?.[0]?.url || item.image}
                                                            alt='Product'
                                                            className='aspect-square w-full object-cover'
                                                        />
                                                    )}
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
                            </div>

                            {/* Right: meta */}
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

                                <button
                                    onClick={handleOpenDialog}
                                    disabled={
                                        order.isReturned === true ||
                                        order.orderStatus === 'Processing' ||
                                        order.orderStatus === 'Shipped'
                                    }
                                    className='btn-outline w-full'
                                >
                                    Request Return
                                </button>
                            </div>
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

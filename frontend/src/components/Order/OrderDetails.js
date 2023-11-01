import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import {
    clearErrors,
    getOrderDetails,
    returnRequest
} from '../../actions/orderAction';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    MenuItem,
    Select,
    Typography
} from '@material-ui/core';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';
import MetaData from '../layout/MetaData';

import './OrderDetails.css';

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
        "Item Doesn't Meet Expectations"
    ];

    const submitReturnRequest = (orders, selectedReturnReason) => {
        if (orders && selectedReturnReason) {
            dispatch(returnRequest(order._id, selectedReturnReason));
            toast.success('Return request submitted successfully');
            handleCloseDialog();
        }
        setProgress(progress + 80);
    };

    const handleOpenDialog = order => {
        setOpenDialog(true);
        setSelectedOrder(order);
        setSelectedReturnReason(order.returnReason || returnReasons[0]);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
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

    return (
        <Fragment>
            {loading ? (
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <Fragment>
                    <MetaData title='Order Details' />
                    <div className='orderDetailsPage'>
                        <div className='orderDetailsContainer'>
                            <Typography component='h1'>
                                Order #{order && order._id}
                            </Typography>
                            <Typography>Shipping Info</Typography>
                            <div className='orderDetailsContainerBox'>
                                <div>
                                    <p>Name:</p>
                                    <span>{order.user && order.user.name}</span>
                                </div>
                                <div>
                                    <p>Phone:</p>
                                    <span>
                                        {order.shippingInfo &&
                                            order.shippingInfo.phoneNumber}
                                    </span>
                                </div>
                                <div>
                                    <p>Address:</p>
                                    <span>
                                        {order.shippingInfo &&
                                            `${order.shippingInfo.address}, ${order.shippingInfo.city}, ${order.shippingInfo.state}, ${order.shippingInfo.pinCode}, ${order.shippingInfo.country}`}
                                    </span>
                                </div>
                            </div>
                            <Typography>Payment</Typography>
                            <div className='orderDetailsContainerBox'>
                                <div>
                                    <p
                                        className={
                                            order.paymentInfo &&
                                            order.paymentInfo.status ===
                                                'succeeded'
                                                ? 'greenColor'
                                                : 'redColor'
                                        }
                                    >
                                        {order.paymentInfo &&
                                        order.paymentInfo.status === 'succeeded'
                                            ? 'PAID'
                                            : 'NOT PAID'}
                                    </p>
                                </div>

                                <div>
                                    <p>Amount:</p>
                                    <span>
                                        {order.totalPrice && order.totalPrice}
                                    </span>
                                </div>
                            </div>

                            <Typography>Order Status</Typography>
                            <div className='orderDetailsContainerBox'>
                                <div>
                                    <p
                                        className={
                                            order.orderStatus &&
                                            order.orderStatus === 'Delivered'
                                                ? 'greenColor'
                                                : 'redColor'
                                        }
                                    >
                                        {order.orderStatus && order.orderStatus}
                                    </p>
                                </div>
                            </div>
                            <div className='returnButtonContainer'>
                                <button
                                    className='refundButton'
                                    onClick={handleOpenDialog}
                                    disabled={
                                        order.isReturned === true ||
                                        order.orderStatus === 'Processing' ||
                                        order.orderStatus === 'Shipped'
                                    }
                                    style={{
                                        backgroundColor:
                                            'rgba(70, 117, 218, 0.932)',
                                        color: 'white',
                                        padding: '10px 20px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Return
                                </button>
                                <Dialog
                                    open={openDialog}
                                    onClose={handleCloseDialog}
                                    maxWidth='sm'
                                    fullWidth
                                >
                                    <DialogTitle>
                                        Confirm Order Details
                                    </DialogTitle>
                                    <DialogContent>
                                        <Typography variant='h5'>
                                            Order Details:
                                        </Typography>
                                        {order && order.orderItems ? (
                                            <div>
                                                <Typography>
                                                    Order ID: {order._id}
                                                </Typography>
                                                {/* Display product images and details */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {order.orderItems.map(
                                                        item => (
                                                            <div
                                                                key={item._id}
                                                                style={{
                                                                    marginRight:
                                                                        '20px'
                                                                }}
                                                            >
                                                                <img
                                                                    src={
                                                                        item.image
                                                                    }
                                                                    alt={
                                                                        item.name
                                                                    }
                                                                    style={{
                                                                        width:
                                                                            '300px',
                                                                        height:
                                                                            '300px',
                                                                        objectFit:
                                                                            'contain'
                                                                    }}
                                                                />
                                                                <Typography>
                                                                    Product
                                                                    Name:{' '}
                                                                    {item.name}
                                                                </Typography>
                                                                <Typography>
                                                                    Quantity:{' '}
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </Typography>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                                <Typography>
                                                    Amount: {order.totalPrice}
                                                </Typography>
                                            </div>
                                        ) : (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div className='loader'></div>{' '}
                                            </div>
                                        )}

                                        <Typography variant='h5'>
                                            Select reason for return:
                                        </Typography>
                                        <FormControl fullWidth>
                                            <Select
                                                value={selectedReturnReason}
                                                onChange={event =>
                                                    setSelectedReturnReason(
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {returnReasons.map(reason => (
                                                    <MenuItem
                                                        key={reason}
                                                        value={reason}
                                                    >
                                                        {reason}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button
                                            onClick={handleCloseDialog}
                                            color='secondary'
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                submitReturnRequest(
                                                    selectedOrder,
                                                    selectedReturnReason
                                                )
                                            }
                                            color='secondary'
                                        >
                                            Return
                                        </Button>
                                    </DialogActions>
                                </Dialog>
                            </div>
                        </div>

                        <div className='orderDetailsItems'>
                            <Typography>Order Items:</Typography>
                            <div className='scrollable-content'>
                                <div className='orderDetailsCartItemsContainer'>
                                    {order.orderItems &&
                                        order.orderItems.map(item => (
                                            <div
                                                className='orderItem'
                                                key={item.product}
                                            >
                                                <div className='orderItemImg'>
                                                    {/* Check if the product has multiple images */}
                                                    {item.images.length > 1 ? (
                                                        // If there are multiple images, display them in a carousel
                                                        <Carousel
                                                            showThumbs={false}
                                                        >
                                                            {item.images.map(
                                                                (
                                                                    images,
                                                                    index
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            index
                                                                        }
                                                                    >
                                                                        <img
                                                                            src={
                                                                                images.url
                                                                            }
                                                                            alt={`Product ${index +
                                                                                1}`}
                                                                        />
                                                                    </div>
                                                                )
                                                            )}
                                                        </Carousel>
                                                    ) : (
                                                        // If there's only one image, display it as a regular image
                                                        <img
                                                            src={
                                                                item.images[0]
                                                                    .url
                                                            }
                                                            alt='Product'
                                                        />
                                                    )}
                                                </div>
                                                <div className='orderItemDetails'>
                                                    <Link
                                                        to={`/product/${item.product}`}
                                                    >
                                                        <Typography variant='h6'>
                                                            {item.name}
                                                        </Typography>
                                                    </Link>
                                                    <Typography>
                                                        Quantity:{' '}
                                                        {item.quantity}
                                                    </Typography>
                                                    <Typography>
                                                        Price: ₹{item.price}
                                                    </Typography>
                                                    <Typography>
                                                        Total: ₹
                                                        {item.price *
                                                            item.quantity}
                                                    </Typography>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default OrderDetails;

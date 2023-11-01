import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { UPDATE_ORDER_RESET } from '../../constants/orderConstants';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import {
    clearErrors,
    getOrderDetails,
    initiateRefund,
    updateOrder,
    updateRefundStatus
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
import MetaData from '../layout/MetaData';
import LoadingBar from 'react-top-loading-bar';

import './ProcessOrder.css';

const ProcessOrder = () => {

    const { order, error, loading } = useSelector(state => state.orderDetails);
    const { error: updateError, isUpdated } = useSelector(state => state.order);

    const dispatch = useDispatch();
    const { id } = useParams();

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedRefundStatus, setSelectedRefundStatus] = useState('');
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const submitRefundRequest_1 = id => {
        if (order) {
            setProgress(50);
            dispatch(initiateRefund(id));
            toast.success('Refund request initiated successfully');
            handleCloseDialog_1();
        }
    };

    const handleOpenDialog_1 = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog_1 = () => {
        setOpenDialog(false);
    };

    const submitRefundRequest_2 = () => {
        if (order) {
            dispatch(
                updateRefundStatus(
                    order?._id,
                    order?.refund[0],
                    selectedRefundStatus
                )
            );
            toast.success('Refund status updated successfully');
            handleCloseDialog_2();
        }
    };

    const handleOpenDialog_2 = () => {
        setOpenDialog(true);
        setSelectedRefundStatus(options[4]);
    };

    const handleCloseDialog_2 = () => {
        setOpenDialog(false);
    };

    const updateOrderSubmitHandler = e => {
        e.preventDefault();
        const myForm = new FormData();
        myForm.set('status', status);
        dispatch(updateOrder(id, status));
    };

    const options = [
        'Processing',
        'Rejected',
        'Pending',
        'Approve',
        'Refunded'
    ];

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

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='red' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Update Order Status' />
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
                                    onClick={handleOpenDialog_1}
                                    disabled={
                                        order.isRefunded === true ||
                                        order.isReturned === false
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
                                    Initiate Refund
                                </button>

                                <button
                                    className='refundButton'
                                    onClick={handleOpenDialog_2}
                                    disabled={
                                        order.isRefunded === false &&
                                        order.isReturned === false
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
                                    Approve Refund
                                </button>
                                <Dialog
                                    open={openDialog}
                                    onClose={handleCloseDialog_1}
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
                                                {/* Add more details if needed */}
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
                                    </DialogContent>
                                    <DialogActions>
                                        <Button
                                            onClick={handleCloseDialog_1}
                                            color='secondary'
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                submitRefundRequest_1(id)
                                            }
                                            color='secondary'
                                        >
                                            Initiate Refund
                                        </Button>
                                    </DialogActions>
                                </Dialog>

                                <Dialog
                                    open={openDialog}
                                    onClose={handleCloseDialog_2}
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
                                                {/* Add more details if needed */}
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
                                            Update Refund Status:
                                        </Typography>
                                        <FormControl fullWidth>
                                            <Select
                                                value={selectedRefundStatus}
                                                onChange={event =>
                                                    setSelectedRefundStatus(
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {options.map(reason => (
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
                                            onClick={handleCloseDialog_1}
                                            color='secondary'
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                submitRefundRequest_2(id)
                                            }
                                            color='secondary'
                                        >
                                            Approve Refund
                                        </Button>
                                    </DialogActions>
                                </Dialog>
                            </div>
                        </div>

                        {/* Right Side */}
                        <div className='orderDetailsItems'>
                            <Typography variant='h5'>Order Items:</Typography>
                            <div className='orderDetailsCartItemsContainer'>
                                {order.orderItems &&
                                    order.orderItems.map(item => (
                                        <div
                                            className='orderItem'
                                            key={item.product}
                                        >
                                            <div className='orderItemImg'>
                                                <img
                                                    src={item.image}
                                                    alt='Product'
                                                />
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
                                                    Quantity: {item.quantity}
                                                </Typography>
                                                <Typography>
                                                    Price: ₹{item.price}
                                                </Typography>
                                                <Typography>
                                                    Total: ₹
                                                    {item.price * item.quantity}
                                                </Typography>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            <div
                                style={{
                                    display:
                                        order.orderStatus === 'Delivered'
                                            ? 'none'
                                            : 'block'
                                }}
                            >
                                <form
                                    className='updateOrderForm'
                                    onSubmit={updateOrderSubmitHandler}
                                >
                                    <h1>Process Order</h1>

                                    <div>
                                        <AccountTreeIcon />
                                        <select
                                            onChange={e =>
                                                setStatus(e.target.value)
                                            }
                                        >
                                            <option value=''>
                                                Choose Category
                                            </option>
                                            {order.orderStatus ===
                                                'Processing' && (
                                                <option value='Shipped'>
                                                    Shipped
                                                </option>
                                            )}

                                            {order.orderStatus ===
                                                'Shipped' && (
                                                <option value='Delivered'>
                                                    Delivered
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    <Button
                                        id='createProductBtn'
                                        type='submit'
                                        disabled={
                                            loading
                                                ? true
                                                : false || status === ''
                                                ? true
                                                : false
                                        }
                                        onClick={() => setProgress(progress + 60)}
                                    >
                                        Process
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ProcessOrder;

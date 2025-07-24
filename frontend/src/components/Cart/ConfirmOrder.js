import React, { Fragment, useEffect, useState } from 'react';
import CheckoutSteps from '../Cart/CheckoutSteps';
import { useDispatch, useSelector } from 'react-redux';
import MetaData from '../layout/MetaData';
import './ConfirmOrder.css';
import { Link, useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import { getAllCoupons } from '../../actions/couponAction';

const ConfirmOrder = () => {
    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.user);
    const { coupons } = useSelector(state => state.coupon);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [selectedCoupon, setSelectedCoupon] = useState(null);

    const subtotal = cartItems.reduce(
        (acc, item) => acc + item.quantity * item.price,
        0
    );

    const shippingCharges = subtotal > 1000 ? 0 : 150;

    const selectedCouponValue = selectedCoupon ? selectedCoupon.discount : 0;

    const couponDiscountAmount = (subtotal * selectedCouponValue) / 100;

    const totalPrice = subtotal + shippingCharges - couponDiscountAmount;

    const address = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state}, ${shippingInfo.pinCode}, ${shippingInfo.country}`;

    const proceedToPayment = () => {
        const data = {
            subtotal,
            shippingCharges,
            totalPrice,
            selectedCoupon
        };

        sessionStorage.setItem('orderInfo', JSON.stringify(data));

        navigate('/payment');
    };

    useEffect(() => {
        dispatch(getAllCoupons());
    }, [dispatch]);

    return (
        <Fragment>
            <MetaData title='Confirm Order' />
            <CheckoutSteps activeStep={1} />
            <div className='confirmOrderPage'>
                <div>
                    <div className='confirmShippingArea'>
                        <Typography>Shipping Info</Typography>
                        <div className='confirmShippingAreaBox'>
                            <div>
                                <p>Name:</p>
                                <span>{user.name}</span>
                            </div>
                            <div>
                                <p>Phone:</p>
                                <span>{shippingInfo.phoneNumber}</span>
                            </div>
                            <div>
                                <p>Address:</p>
                                <span>{address}</span>
                            </div>
                        </div>
                    </div>
                    <div className='confirmCartItems'>
                        <Typography>Your Cart Items:</Typography>
                        <div className='confirmCartItemsContainer'>
                            {cartItems &&
                                cartItems.map(item => (
                                    <div key={item.product}>
                                        <img src={item.image} alt='Product' />
                                        <Link to={`/product/${item.product}`}>
                                            {item.name}
                                        </Link>{' '}
                                        <span>
                                            {item.quantity} x ₹{item.price} ={' '}
                                            <span>
                                                <b>
                                                    ₹
                                                    {item.price * item.quantity}
                                                </b>
                                            </span>
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
                {/*  */}
                <div>
                    <div className='orderSummary'>
                        <Typography>Order Summary</Typography>
                        <div>
                            <div>
                                <p>Subtotal:</p>
                                <span>₹{subtotal}</span>
                            </div>
                            <div>
                                <p>Shipping Charges:</p>
                                <span>₹{shippingCharges}</span>
                            </div>
                            <div className='couponSelection'>
                                <label>Select Coupon:</label>
                                <select
                                    onChange={e => {
                                        const selectedCouponId = e.target.value;
                                        const selectedCouponObj = coupons.find(
                                            coupon =>
                                                coupon._id === selectedCouponId
                                        );
                                        setSelectedCoupon(selectedCouponObj);
                                    }}
                                >
                                    <option value={null}>No Coupon</option>
                                    {coupons.map(coupon => (
                                        <option
                                            key={coupon._id}
                                            value={coupon._id}
                                        >
                                            {`${coupon.code} - ${coupon.discount}%`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className='orderSummaryTotal'>
                            <p>
                                <b>Total:</b>
                            </p>
                            <span>₹{totalPrice}</span>
                        </div>

                        <button onClick={proceedToPayment}>
                            Proceed To Payment
                        </button>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default ConfirmOrder;

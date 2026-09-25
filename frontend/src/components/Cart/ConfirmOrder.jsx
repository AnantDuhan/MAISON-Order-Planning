import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';
import { getAllCoupons } from '../../actions/couponAction';

const ConfirmOrder = () => {
    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.user);
    const { coupons } = useSelector(state => state.coupon);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [selectedCoupon, setSelectedCoupon] = useState(null);

    const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const shippingCharges = subtotal > 1000 ? 0 : 150;
    const selectedCouponValue = selectedCoupon ? selectedCoupon.discount : 0;
    const couponDiscountAmount = (subtotal * selectedCouponValue) / 100;
    const totalPrice = subtotal + shippingCharges - couponDiscountAmount;

    const address = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state}, ${shippingInfo.pinCode}, ${shippingInfo.country}`;

    const proceedToPayment = () => {
        const data = { subtotal, shippingCharges, totalPrice, selectedCoupon };
        sessionStorage.setItem('orderInfo', JSON.stringify(data));
        navigate('/payment');
    };

    useEffect(() => {
        dispatch(getAllCoupons());
    }, [dispatch]);

    return (
        <Fragment>
            <MetaData title='Confirm Order · Maison' />
            <CheckoutSteps activeStep={1} />

            <div className='editorial-shell py-14'>
                <div className='grid gap-14 lg:grid-cols-[1fr_360px]'>
                    {/* Left */}
                    <div>
                        <div>
                            <p className='eyebrow'>Shipping Info</p>
                            <div className='mt-5 space-y-3 border border-line bg-surface p-6'>
                                <div className='flex justify-between'>
                                    <span className='font-sans text-sm text-ink-faint'>Name</span>
                                    <span className='font-sans text-sm text-ink'>{user?.name}</span>
                                </div>
                                <div className='flex justify-between'>
                                    <span className='font-sans text-sm text-ink-faint'>Phone</span>
                                    <span className='font-sans text-sm text-ink'>{shippingInfo.phoneNumber}</span>
                                </div>
                                <div className='flex justify-between gap-8'>
                                    <span className='font-sans text-sm text-ink-faint'>Address</span>
                                    <span className='text-right font-sans text-sm text-ink'>{address}</span>
                                </div>
                            </div>
                        </div>

                        <div className='mt-10'>
                            <p className='eyebrow'>Your Cart Items</p>
                            <div className='mt-5 divide-y divide-line border border-line bg-surface'>
                                {cartItems &&
                                    cartItems.map(item => (
                                        <div key={item.product} className='flex items-center gap-5 p-5'>
                                            <img src={item.image} alt='Product' className='h-16 w-14 border border-line object-cover' />
                                            <Link
                                                to={`/product/${item.product}`}
                                                className='flex-1 font-display text-lg font-medium text-ink hover:text-brass'
                                            >
                                                {item.name}
                                            </Link>
                                            <span className='font-sans text-sm text-ink-soft'>
                                                {item.quantity} × ₹{item.price} ={' '}
                                                <b className='text-ink'>₹{item.price * item.quantity}</b>
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className='lg:sticky lg:top-28 lg:self-start'>
                        <div className='border border-line bg-surface p-8'>
                            <h3 className='eyebrow'>Order Summary</h3>
                            <div className='mt-6 space-y-3'>
                                <div className='flex justify-between font-sans text-sm text-ink-soft'>
                                    <span>Subtotal</span>
                                    <span>₹{subtotal}</span>
                                </div>
                                <div className='flex justify-between font-sans text-sm text-ink-soft'>
                                    <span>Shipping Charges</span>
                                    <span>{shippingCharges === 0 ? 'Complimentary' : `₹${shippingCharges}`}</span>
                                </div>
                            </div>

                            <div className='mt-6'>
                                <label className='eyebrow'>Select Coupon</label>
                                <select
                                    onChange={e => {
                                        const selectedCouponObj = coupons.find(coupon => coupon._id === e.target.value);
                                        setSelectedCoupon(selectedCouponObj);
                                    }}
                                    className='mt-3 w-full border border-line bg-transparent px-4 py-3 font-sans text-sm text-ink focus:border-brass focus:outline-none'
                                >
                                    <option value=''>No Coupon</option>
                                    {coupons.map(coupon => (
                                        <option key={coupon._id} value={coupon._id}>
                                            {`${coupon.code} — ${coupon.discount}%`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className='my-6 rule-luxe' />
                            <div className='flex items-center justify-between'>
                                <span className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink'>Total</span>
                                <span className='font-display text-2xl font-medium text-ink'>₹{totalPrice}</span>
                            </div>
                            <button onClick={proceedToPayment} className='btn-solid mt-8 w-full'>
                                Proceed to Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default ConfirmOrder;

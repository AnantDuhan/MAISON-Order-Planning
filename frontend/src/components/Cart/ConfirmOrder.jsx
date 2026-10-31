import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';
import { getAllCoupons } from '../../actions/couponAction';
import { useFeature } from '../../context/FeatureFlagsContext';
import { formatINR } from '../../utils/priceLabel';
import { shippingFor } from '../../utils/delivery';
import { useIsMember } from '../../utils/useIsMember';
import { formatAddress } from '../../utils/indiaRegions';

const ConfirmOrder = () => {
    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.user);
    // The API lists only coupons still running; this also drops any that
    // ran out while the page was open.
    const coupons = (useSelector(state => state.coupon?.coupons) || [])
        .filter(c => !c.expiresAt || new Date(c.expiresAt).getTime() > Date.now());

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const couponsOn = useFeature('coupons');

    const subtotal = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const isMember = useIsMember();
    const shippingCharges = shippingFor(subtotal, isMember);
    const selectedCouponValue = selectedCoupon ? selectedCoupon.discount : 0;
    const couponDiscountAmount = (subtotal * selectedCouponValue) / 100;
    const totalPrice = subtotal + shippingCharges - couponDiscountAmount;

    const address = formatAddress(shippingInfo);

    const proceedToPayment = () => {
        const data = { subtotal, shippingCharges, totalPrice, selectedCoupon };
        sessionStorage.setItem('orderInfo', JSON.stringify(data));
        navigate('/payment');
    };

    useEffect(() => {
        dispatch(getAllCoupons());
    }, [dispatch]);

    // Nothing to review without items or an address (direct visit, new tab).
    const missing = !cartItems?.length ? '/cart' : !shippingInfo?.address ? '/shipping' : null;
    useEffect(() => {
        if (missing) navigate(missing, { replace: true });
    }, [missing, navigate]);
    if (missing) return null;

    return (
        <Fragment>
            <MetaData title='Confirm Order · Maison' noIndex />
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
                                    <span className='font-sans text-sm text-ink'>+91 {shippingInfo.phoneNumber}</span>
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
                                        <div key={`${item.product}|${item.variant || ''}`} className='flex items-start gap-4 p-5 sm:items-center sm:gap-5'>
                                            <img src={item.image} alt='' className='h-16 w-14 shrink-0 border border-line object-cover' />
                                            <div className='flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-5'>
                                                <Link
                                                    to={`/product/${item.product}`}
                                                    className='min-w-0 font-display text-lg font-medium leading-snug text-ink hover:text-brass'
                                                >
                                                    {item.name}
                                                    {item.variantLabel && (
                                                        <span className='mt-1 block font-sans text-sm font-normal text-ink-soft'>{item.variantLabel}</span>
                                                    )}
                                                </Link>
                                                <span className='shrink-0 font-sans text-sm text-ink-soft'>
                                                    {item.quantity} × {formatINR(item.price)} ={' '}
                                                    <b className='text-ink'>{formatINR(item.price * item.quantity)}</b>
                                                </span>
                                            </div>
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
                                    <span>{formatINR(subtotal)}</span>
                                </div>
                                <div className='flex justify-between font-sans text-sm text-ink-soft'>
                                    <span>Shipping Charges</span>
                                    <span>{shippingCharges === 0 ? (isMember && subtotal <= 1000 ? 'Complimentary · Member' : 'Complimentary') : formatINR(shippingCharges)}</span>
                                </div>
                            </div>

                            {couponsOn && (
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
                                        <option key={coupon._id} value={coupon._id} disabled={coupon.membersOnly && !isMember}>
                                            {`${coupon.code} — ${coupon.discount}%${coupon.membersOnly ? (isMember ? ' · members' : ' · members only') : ''}`}
                                        </option>
                                    ))}
                                </select>
                                {!isMember && coupons.some(c => c.membersOnly) && (
                                    <p className='mt-2 font-sans text-xs text-ink-faint'>
                                        Some offers are for members. <Link to='/membership' className='text-brass underline-offset-4 hover:underline'>See membership</Link>
                                    </p>
                                )}
                            </div>
                            )}

                            <div className='my-6 rule-luxe' />
                            <div className='flex items-center justify-between'>
                                <span className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink'>Total</span>
                                <span className='font-display text-2xl font-medium text-ink'>{formatINR(totalPrice)}</span>
                            </div>
                            {/* Wait for the membership check so the total shown is the total charged. */}
                            <button
                                onClick={proceedToPayment}
                                disabled={isMember === undefined}
                                className='btn-solid mt-8 w-full disabled:opacity-40'
                            >
                                {isMember === undefined ? 'Checking your benefits…' : 'Proceed to Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default ConfirmOrder;

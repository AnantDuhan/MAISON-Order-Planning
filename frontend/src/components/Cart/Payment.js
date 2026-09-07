import React, { Fragment, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { CircularProgress } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import axios from 'axios';

import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';
import { createOrder, clearErrors } from '../../actions/orderAction';

const cashfree = window.Cashfree
    ? window.Cashfree({ mode: process.env.REACT_APP_CASHFREE_MODE || 'sandbox' })
    : null;

const Payment = () => {
    const orderInfo = JSON.parse(sessionStorage.getItem('orderInfo'));

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { error } = useSelector(state => state.newOrder);

    const [isProcessing, setIsProcessing] = useState(false);

    const submitHandler = async e => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            if (!cashfree) {
                throw new Error('Cashfree checkout is unavailable. Please refresh and try again.');
            }

            const { data } = await axios.post('/api/v1/cashfree/order', {
                amount: orderInfo.totalPrice,
                phoneNumber: shippingInfo.phoneNumber,
            });
            const result = await cashfree.checkout({
                paymentSessionId: data.paymentSessionId,
                redirectTarget: '_modal',
            });

            if (result?.error || !result?.paymentDetails) {
                setIsProcessing(false);
                toast.info('Payment was not completed. You can try again.');
                return;
            }

            const verification = await axios.get(`/api/v1/cashfree/order/${data.orderId}/verify`);
            if (verification.data.status !== 'PAID') {
                throw new Error('Payment could not be verified. Please try again.');
            }

            await dispatch(createOrder({
                shippingInfo,
                orderItems: cartItems,
                itemsPrice: orderInfo.subtotal,
                taxPrice: orderInfo.tax || 0,
                shippingPrice: orderInfo.shippingCharges,
                totalPrice: orderInfo.totalPrice,
                couponCode: orderInfo.selectedCoupon?.code,
                paymentInfo: {
                    id: data.orderId,
                    provider: 'cashfree',
                    status: 'PAID',
                },
            }));
            toast.success('Payment processed successfully.');
            navigate('/success');
        } catch (error) {
            setIsProcessing(false);
            toast.error(error.response?.data?.message || error.message || 'Payment failed.');
        }
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
    }, [dispatch, error]);

    return (
        <Fragment>
            <MetaData title='Payment · Maison' />
            <CheckoutSteps activeStep={2} />

            <div className='form-shell !min-h-0'>
                <div className='form-card text-center'>
                    <p className='eyebrow'>Secure Checkout · Demo</p>

                    <div className='mt-8 flex flex-col items-center'>
                        <VerifiedUserIcon sx={{ fontSize: 48, color: '#4F6E54' }} />
                        <p className='mt-4 font-sans text-sm leading-relaxed text-ink-soft'>
                            You will be redirected to Cashfree’s secure checkout. Your order is
                            created only after the payment is verified.
                        </p>
                        <p className='mt-6 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                            Total Due
                        </p>
                        <p className='mt-1 font-display text-4xl font-medium text-ink'>
                            ₹{orderInfo && orderInfo.totalPrice}
                        </p>
                    </div>

                    <div className='mt-10'>
                        {isProcessing ? (
                            <div className='flex flex-col items-center gap-3'>
                                <CircularProgress sx={{ color: '#A07C4B' }} />
                                <span className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft'>
                                    Contacting Bank…
                                </span>
                            </div>
                        ) : (
                            <button onClick={submitHandler} className='btn-solid w-full'>
                                Pay securely with Cashfree · ₹{orderInfo && orderInfo.totalPrice}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Payment;

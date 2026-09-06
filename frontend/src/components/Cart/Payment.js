import React, { Fragment, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import { CircularProgress } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';
import { createOrder, clearErrors } from '../../actions/orderAction';

const Payment = () => {
    const orderInfo = JSON.parse(sessionStorage.getItem('orderInfo'));

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { error } = useSelector(state => state.newOrder);

    const [isProcessing, setIsProcessing] = useState(false);

    const submitHandler = e => {
        e.preventDefault();
        setIsProcessing(true);

        // Simulated gateway — mimics a 3s bank round-trip
        setTimeout(() => {
            try {
                const order = {
                    shippingInfo,
                    orderItems: cartItems,
                    itemsPrice: orderInfo.subtotal,
                    taxPrice: orderInfo.tax,
                    shippingPrice: orderInfo.shippingCharges,
                    totalPrice: orderInfo.totalPrice,
                    paymentInfo: {
                        id: `mock_pay_${Math.random().toString(36).substr(2, 9)}`,
                        status: 'succeeded',
                    },
                };

                dispatch(createOrder(order));
                toast.success('Payment Processed Successfully!');
                navigate('/success');
            } catch (error) {
                setIsProcessing(false);
                toast.error('Simulated Payment Failed.');
            }
        }, 3000);
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
                            This is a simulated payment gateway for academic purposes. No real
                            money will be deducted.
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
                                Simulate Payment of ₹{orderInfo && orderInfo.totalPrice}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Payment;

import React, { Fragment, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import Loader from '../layout/Loader/Loader';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import axios from 'axios';

import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';
import { createOrder, clearErrors } from '../../actions/orderAction';
import { useFeature } from '../../context/FeatureFlagsContext';

const cashfree = window.Cashfree
    ? window.Cashfree({ mode: import.meta.env.REACT_APP_CASHFREE_MODE || 'sandbox' })
    : null;

const Payment = () => {
    const orderInfo = JSON.parse(sessionStorage.getItem('orderInfo'));

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { error } = useSelector(state => state.newOrder);

    const [isProcessing, setIsProcessing] = useState(false);
    const [storeCredit, setStoreCredit] = useState(0);
    const [useStoreCredit, setUseStoreCredit] = useState(false);
    const storeCreditOn = useFeature('storeCredit');

    useEffect(() => {
        axios.get('/api/v1/wallet/me')
            .then(({ data }) => {
                setStoreCredit(data.balance || 0);
                setUseStoreCredit((data.balance || 0) > 0);
            })
            .catch(() => {});
    }, []);

    const total = Number(orderInfo?.totalPrice || 0);
    const creditToApply = useStoreCredit && storeCreditOn ? Math.min(storeCredit, total) : 0;
    const dueNow = Math.max(0, Math.round((total - creditToApply) * 100) / 100);

    const submitHandler = async e => {
        e.preventDefault();
        setIsProcessing(true);

        try {

            // The server prices the order from the catalogue; only product ids,
            // quantities and the coupon code are sent.
            const pricedItems = cartItems.map(item => ({
                product: item.product,
                quantity: item.quantity,
            }));
            const couponCode = orderInfo.selectedCoupon?.code;

            const { data } = await axios.post('/api/v1/cashfree/order', {
                orderItems: pricedItems,
                couponCode,
                phoneNumber: shippingInfo.phoneNumber,
                useStoreCredit: useStoreCredit && storeCreditOn,
            });

            // Store credit covered everything: place the order directly.
            if (data.walletOnly) {
                const createdOrder = await dispatch(createOrder({
                    shippingInfo,
                    orderItems: pricedItems,
                    couponCode,
                    paymentInfo: { id: data.orderId, provider: 'wallet', status: 'PAID' },
                }));
                if (!createdOrder?.success) {
                    throw new Error('The order could not be created. Your store credit has not been used.');
                }
                toast.success('Order placed with store credit.');
                navigate('/success');
                return;
            }

            if (!cashfree) {
                throw new Error('Cashfree checkout is unavailable. Please refresh and try again.');
            }
            const result = await cashfree.checkout({
                paymentSessionId: data.paymentSessionId,
                redirectTarget: '_modal',
            });

            if (result?.error) {
                setIsProcessing(false);
                toast.info('Payment was not completed. You can try again.');
                return;
            }

            if (result?.redirect) {
                return;
            }

            const verification = await axios.get(`/api/v1/cashfree/order/${data.orderId}/verify`);
            if (verification.data.status !== 'PAID') {
                throw new Error('Payment could not be verified. Please try again.');
            }

            const createdOrder = await dispatch(createOrder({
                shippingInfo,
                orderItems: pricedItems,
                couponCode,
                paymentInfo: {
                    id: data.orderId,
                    provider: 'cashfree',
                    status: 'PAID',
                },
            }));
            if (!createdOrder?.success) {
                throw new Error('Payment succeeded, but the order could not be created. Please contact support.');
            }
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
                            ₹{dueNow}
                        </p>
                        {creditToApply > 0 && (
                            <p className='mt-2 font-sans text-xs text-ink-faint'>
                                ₹{total} total − ₹{creditToApply} store credit
                            </p>
                        )}
                    </div>

                    {storeCreditOn && storeCredit > 0 && (
                        <label className='mt-8 flex cursor-pointer items-center justify-between gap-4 border border-line px-5 py-4 text-left'>
                            <span>
                                <span className='block font-sans text-sm text-ink'>Use store credit</span>
                                <span className='block font-sans text-xs text-ink-faint'>₹{storeCredit} available</span>
                            </span>
                            <input
                                type='checkbox'
                                checked={useStoreCredit}
                                onChange={e => setUseStoreCredit(e.target.checked)}
                                className='h-4 w-4 accent-[#A07C4B]'
                            />
                        </label>
                    )}

                    <div className='mt-10'>
                        {isProcessing ? (
                            <Loader inline label='Confirming your payment' />
                        ) : (
                            <button onClick={submitHandler} className='btn-solid w-full'>
                                {dueNow === 0
                                    ? `Place order with store credit · ₹${creditToApply}`
                                    : `Pay securely with Cashfree · ₹${dueNow}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Payment;

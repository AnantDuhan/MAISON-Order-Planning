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
import { formatINR } from '../../utils/priceLabel';
import { CASHFREE_MODE, loadCashfree, preloadCashfree } from '../../utils/loadCashfree';
import { clearGuestContact, getGuestContact, saveLastGuestOrder, useCheckoutAccess } from '../../utils/guestCheckout';


const Payment = () => {
    // Set by Confirm Order. Missing when /payment is opened directly, in a new
    // tab or after the session ends, so send the shopper back to review.
    let orderInfo = null;
    try {
        orderInfo = JSON.parse(sessionStorage.getItem('orderInfo'));
    } catch {
        orderInfo = null;
    }

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { error } = useSelector(state => state.newOrder);

    const [isProcessing, setIsProcessing] = useState(false);
    const access = useCheckoutAccess();
    const guestContact = access.isGuest ? getGuestContact() : null;

    useEffect(preloadCashfree, []);
    const dueNow = Number(orderInfo?.totalPrice || 0);
    const ready = dueNow > 0 && cartItems?.length > 0 && (!access.isGuest || Boolean(guestContact?.email));

    useEffect(() => {
        if (access.ready && !ready) navigate(cartItems?.length ? '/order/confirm' : '/cart', { replace: true });
    }, [access.ready, ready, cartItems?.length, navigate]);

    const submitHandler = async e => {
        e.preventDefault();
        setIsProcessing(true);

        try {

            // The server prices the order from the catalogue; only product ids,
            // quantities and the coupon code are sent.
            const pricedItems = cartItems.map(item => ({
                product: item.product,
                ...(item.variant && { variant: item.variant }),
                quantity: item.quantity,
            }));
            const couponCode = orderInfo?.selectedCoupon?.code;
            const isGuest = access.isGuest;

            // Guests use their own endpoints: a signed guest token, returned
            // when the payment starts, ties the next steps to this checkout.
            const { data } = isGuest
                ? await axios.post('/api/v1/cashfree/guest/order', {
                    orderItems: pricedItems,
                    couponCode,
                    guest: { ...guestContact, phone: shippingInfo.phoneNumber },
                })
                : await axios.post('/api/v1/cashfree/order', {
                    orderItems: pricedItems,
                    couponCode,
                    phoneNumber: shippingInfo.phoneNumber,
                });
            const guestHeaders = isGuest ? { headers: { 'X-Guest-Token': data.guestToken } } : undefined;

            const cashfree = await loadCashfree();
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

            const verification = isGuest
                ? await axios.get(`/api/v1/cashfree/guest/order/${data.orderId}/verify`, guestHeaders)
                : await axios.get(`/api/v1/cashfree/order/${data.orderId}/verify`);
            if (verification.data.status !== 'PAID') {
                throw new Error('Payment could not be verified. Please try again.');
            }

            const orderBody = {
                shippingInfo,
                orderItems: pricedItems,
                couponCode,
                paymentInfo: {
                    id: data.orderId,
                    provider: 'cashfree',
                    status: 'PAID',
                },
            };

            if (isGuest) {
                const { data: placed } = await axios.post('/api/v1/order/guest/new', orderBody, guestHeaders);
                if (!placed?.success) {
                    throw new Error('Payment succeeded, but the order could not be created. Please contact support.');
                }
                saveLastGuestOrder({ id: placed.order._id, token: placed.trackingToken, email: placed.email });
                clearGuestContact();
            } else {
                const createdOrder = await dispatch(createOrder(orderBody));
                if (!createdOrder?.success) {
                    throw new Error('Payment succeeded, but the order could not be created. Please contact support.');
                }
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

    if (!ready) return null;

    return (
        <Fragment>
            <MetaData title='Payment · Maison' noIndex />
            <CheckoutSteps activeStep={2} />

            <div className='form-shell !min-h-0'>
                <div className='form-card text-center'>
                    <p className='eyebrow'>Secure checkout{CASHFREE_MODE === 'sandbox' ? ' · Test mode' : ''}</p>

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
                            {formatINR(dueNow)}
                        </p>
                    </div>

                    <div className='mt-10'>
                        {isProcessing ? (
                            <Loader inline label='Confirming your payment' />
                        ) : (
                            <button onClick={submitHandler} className='btn-solid w-full'>
                                {`Pay securely with Cashfree · ${formatINR(dueNow)}`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Payment;

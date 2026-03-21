// import React, { Fragment, useEffect, useRef } from 'react';
// import CheckoutSteps from '../Cart/CheckoutSteps';
// import { useSelector, useDispatch } from 'react-redux';
// import MetaData from '../layout/MetaData';
// import { toast } from 'react-toastify';
// import { Typography } from '@mui/material';
// import {
//     CardNumberElement,
//     CardCvcElement,
//     CardExpiryElement,
//     useStripe,
//     useElements
// } from '@stripe/react-stripe-js';

// import axios from 'axios';
// import './Payment.css';
// import CreditCardIcon from '@mui/icons-material/CreditCard';
// import EventIcon from '@mui/icons-material/Event';
// import VpnKeyIcon from '@mui/icons-material/VpnKey';
// import { createOrder, clearErrors } from '../../actions/orderAction';
// import { useNavigate } from 'react-router';

// const Payment = () => {
//     const orderInfo = JSON.parse(sessionStorage.getItem('orderInfo'));

//     const dispatch = useDispatch();
//     const stripe = useStripe();
//     const elements = useElements();
//     const payBtn = useRef(null);
//     const navigate = useNavigate();

//     const { shippingInfo, cartItems } = useSelector(state => state.cart);
//     const { user } = useSelector(state => state.user);
//     const { error } = useSelector(state => state.newOrder);

//     const paymentData = {
//         amount: Math.round(orderInfo.totalPrice)
//     };

//     const order = {
//         shippingInfo,
//         orderItems: cartItems,
//         itemsPrice: orderInfo.subtotal,
//         taxPrice: orderInfo.tax,
//         shippingPrice: orderInfo.shippingCharges,
//         totalPrice: orderInfo.totalPrice
//     };

//     const submitHandler = async (e) => {
//         e.preventDefault();

//         payBtn.current.disabled = true;

//         try {
//             const config = {
//                 headers: {
//                     'Content-Type': 'application/json'
//                 }
//             };
//             const { data } = await axios.post(
//                 'api/v1/payment',
//                 paymentData,
//                 {config}
//             );

//             const client_secret = data.clientSecret;

//             if (!stripe || !elements) return;

//             const result = await stripe.confirmCardPayment(client_secret, {
//                 payment_method: {
//                     card: elements.getElement(CardNumberElement),
//                     billing_details: {
//                         name: user.name,
//                         email: user.email,
//                         address: {
//                             line1: shippingInfo.address,
//                             city: shippingInfo.city,
//                             state: shippingInfo.state,
//                             postal_code: shippingInfo.pinCode,
//                             country: shippingInfo.country
//                         }
//                     }
//                 }
//             });

//             if (result.error) {
//                 payBtn.current.disabled = false;
//                 toast.error(result.error.message);
//             } else {
//                 if (result.paymentIntent.status === 'succeeded') {
//                     order.paymentInfo = {
//                         id: result.paymentIntent.id,
//                         status: result.paymentIntent.status
//                     };

//                     dispatch(createOrder(order));
//                     toast.success('payment successfull');
//                     navigate('/success');
//                 } else {
//                     toast.error("There's some issue while processing payment ");
//                 }
//             }
//         } catch (error) {
//             payBtn.current.disabled = false;
//             toast.error(error);
//         }
//     };

//     useEffect(() => {
//         if (error) {
//             toast.error(error);
//             dispatch(clearErrors());
//         }
//     }, [dispatch, error]);

//     return (
//         <Fragment>
//             <MetaData title='Payment' />
//             <CheckoutSteps activeStep={2} />
//             <div className='paymentContainer'>
//                 <form className='paymentForm'>
//                     <Typography>Card Info</Typography>
//                     <div>
//                         <CreditCardIcon />
//                         <CardNumberElement className='paymentInput' />
//                     </div>
//                     <div>
//                         <EventIcon />
//                         <CardExpiryElement className='paymentInput' />
//                     </div>
//                     <div>
//                         <VpnKeyIcon />
//                         <CardCvcElement className='paymentInput' />
//                     </div>

//                     <input
//                         type='submit'
//                         value={`Pay - ₹${orderInfo && orderInfo.totalPrice}`}
//                         ref={payBtn}
//                         className='paymentFormBtn'
//                         onClick={e => submitHandler(e)}
//                     />
//                 </form>
//             </div>
//         </Fragment>
//     );
// };

// export default Payment;

import React, { Fragment, useEffect, useState } from 'react';
import CheckoutSteps from '../Cart/CheckoutSteps';
import { useSelector, useDispatch } from 'react-redux';
import MetaData from '../layout/MetaData';
import { toast } from 'react-toastify';
import { Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router';
import { createOrder, clearErrors } from '../../actions/orderAction';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import './Payment.css';

const Payment = () => {
    const orderInfo = JSON.parse(sessionStorage.getItem('orderInfo'));

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { shippingInfo, cartItems } = useSelector(state => state.cart);
    const { error } = useSelector(state => state.newOrder);

    // State to handle the fake loading animation
    const [isProcessing, setIsProcessing] = useState(false);

    const submitHandler = async (e) => {
        e.preventDefault();
        
        // 1. Start the loading spinner
        setIsProcessing(true);

        // 2. Simulate a 3-second network request to a bank
        setTimeout(() => {
            try {
                // 3. Construct the exact order object your backend expects
                const order = {
                    shippingInfo,
                    orderItems: cartItems,
                    itemsPrice: orderInfo.subtotal,
                    taxPrice: orderInfo.tax,
                    shippingPrice: orderInfo.shippingCharges,
                    totalPrice: orderInfo.totalPrice,
                    paymentInfo: {
                        // Generate a fake but realistic-looking transaction ID
                        id: `mock_pay_${Math.random().toString(36).substr(2, 9)}`,
                        status: 'succeeded'
                    }
                };

                // 4. Dispatch to Redux to save in MongoDB
                dispatch(createOrder(order));
                
                // 5. Redirect to success page
                toast.success('Payment Processed Successfully!');
                navigate('/success');

            } catch (error) {
                setIsProcessing(false);
                toast.error("Simulated Payment Failed.");
            }
        }, 3000); // 3000 milliseconds = 3 seconds
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
    }, [dispatch, error]);

    return (
        <Fragment>
            <MetaData title='Payment' />
            <CheckoutSteps activeStep={2} />
            <div className='paymentContainer'>
                <form className='paymentForm' onSubmit={submitHandler}>
                    <Typography>Secure Checkout (Demo Mode)</Typography>
                    
                    <div style={{ padding: "2vmax", textAlign: "center", color: "rgba(0,0,0,0.6)" }}>
                        <VerifiedUserIcon style={{ fontSize: "4vmax", marginBottom: "1vmax", color: "green" }} />
                        <Typography style={{ marginBottom: "1vmax" }}>
                            This is a simulated payment gateway for academic purposes. No real money will be deducted.
                        </Typography>
                        
                        {/* Show the total amount to make it look authentic */}
                        <Typography variant="h5" style={{ fontWeight: "bold", margin: "2vmax 0" }}>
                            Total Due: ₹{orderInfo && orderInfo.totalPrice}
                        </Typography>
                    </div>

                    {/* Toggle between the Pay button and the Loading Spinner */}
                    {isProcessing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <CircularProgress style={{ color: 'tomato' }} />
                            <Typography style={{ marginTop: '1vmax' }}>Contacting Bank...</Typography>
                        </div>
                    ) : (
                        <input
                            type='submit'
                            value={`Simulate Payment of ₹${orderInfo && orderInfo.totalPrice}`}
                            className='paymentFormBtn'
                            style={{ backgroundColor: 'tomato', color: 'white' }}
                        />
                    )}
                </form>
            </div>
        </Fragment>
    );
};

export default Payment;
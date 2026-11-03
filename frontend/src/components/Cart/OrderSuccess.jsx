import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { clearCart } from '../../actions/cartAction';
import MetaData from '../layout/MetaData';
import { claimSignupPath, getLastGuestOrder, trackingPath } from '../../utils/guestCheckout';

const OrderSuccess = () => {
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector(state => state.user);
    // Set by the payment step after a guest order.
    const [guestOrder] = useState(() => (isAuthenticated ? null : getLastGuestOrder()));

    useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    return (
        <div className='editorial-shell flex min-h-[70vh] flex-col items-center justify-center py-24 text-center'>
            <MetaData title='Order Placed · Maison' />
            <CheckCircleOutlineIcon sx={{ fontSize: 72, color: '#A07C4B' }} />
            <p className='eyebrow mt-8'>Thank You</p>
            <h1 className='heading-display mt-3 text-display'>Your order has been placed</h1>
            {guestOrder ? (
                <>
                    <p className='mt-4 max-w-md font-sans text-ink-soft'>
                        Order <span className='text-ink'>{guestOrder.id}</span>. We’ve emailed the confirmation, invoice and
                        a tracking link to <span className='break-all text-ink'>{guestOrder.email}</span>.
                    </p>
                    <Link to={trackingPath(guestOrder.id, guestOrder.token)} className='btn-solid mt-10'>Track this order</Link>

                    <div className='mt-12 w-full max-w-md border border-line bg-surface p-6 text-left'>
                        <p className='font-display text-xl text-ink'>Keep this order in an account</p>
                        <p className='mt-2 font-sans text-sm leading-relaxed text-ink-soft'>
                            Create an account with {guestOrder.email}. Once you verify the email, this order and any
                            other guest orders you placed with it appear under My Orders, ready for returns.
                        </p>
                        <Link to={claimSignupPath(guestOrder.email)} className='btn-outline mt-5 inline-block'>Create an account</Link>
                    </div>
                </>
            ) : (
                <>
                    <p className='mt-4 max-w-md font-sans text-ink-soft'>
                        A confirmation is on its way. We're preparing your pieces with care.
                    </p>
                    <Link to='/orders' className='btn-solid mt-10'>View Orders</Link>
                </>
            )}
        </div>
    );
};

export default OrderSuccess;

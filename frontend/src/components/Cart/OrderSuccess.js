import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

import { clearCart } from '../../actions/cartAction';
import MetaData from '../layout/MetaData';

const OrderSuccess = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    return (
        <div className='editorial-shell flex min-h-[70vh] flex-col items-center justify-center py-24 text-center'>
            <MetaData title='Order Placed · Maison' />
            <CheckCircleOutlineIcon sx={{ fontSize: 72, color: '#A07C4B' }} />
            <p className='eyebrow mt-8'>Thank You</p>
            <h1 className='heading-display mt-3 text-display'>Your order has been placed</h1>
            <p className='mt-4 max-w-md font-sans text-ink-soft'>
                A confirmation is on its way. We're preparing your pieces with care.
            </p>
            <Link to='/orders' className='btn-solid mt-10'>View Orders</Link>
        </div>
    );
};

export default OrderSuccess;

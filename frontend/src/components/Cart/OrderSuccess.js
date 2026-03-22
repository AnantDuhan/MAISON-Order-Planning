import { Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

import { clearCart } from '../../actions/cartAction';

import './OrderSuccess.css';

const OrderSuccess = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    return (
        <div className='orderSuccess'>
            <CheckCircleIcon />

            <Typography>Your Order has been Placed successfully </Typography>
            <Link to='/orders'>View Orders</Link>
        </div>
    );
};

export default OrderSuccess;

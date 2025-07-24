import { Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';

import { clearCart } from '../../actions/cartAction';

import './PlusMembershipSuccess.css';

const PlusMembershipSuccess = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    return (
        <div className='PlusMembershipSuccess'>
            <CheckCircleIcon />

            <Typography>
                Now you are a member of Order Planning Plus Family
            </Typography>
            <Link to='/products'>Enjoy your Shopping</Link>
        </div>
    );
};

export default PlusMembershipSuccess;

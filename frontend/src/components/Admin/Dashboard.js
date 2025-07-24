import React, { Fragment, useEffect } from 'react';
// import Sidebar from './Sidebar.js';
import './Dashboard.css';
import { Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import 'chart.js/auto';
import { Doughnut, Line } from 'react-chartjs-2';
import { useSelector, useDispatch } from 'react-redux';
import { getAdminProduct } from '../../actions/productAction';
import {
    allRefunds,
    allReturns,
    getAllOrders
} from '../../actions/orderAction.js';
import { getAllUsers } from '../../actions/userAction.js';
import MetaData from '../layout/MetaData';

const Dashboard = () => {
    const dispatch = useDispatch();

    const { products } = useSelector(state => state.products);

    const { orders } = useSelector(state => state.allOrders);

    const { users } = useSelector(state => state.allUsers);

    const { refunds } = useSelector(state => state.allRefunds);

    const { returns } = useSelector(state => state.allReturns);

    let outOfStock = 0;

    products &&
        products.forEach(item => {
            if (item.Stock === 0) {
                outOfStock += 1;
            }
        });

    useEffect(() => {
        dispatch(getAdminProduct());
        dispatch(getAllOrders());
        dispatch(getAllUsers());
        dispatch(allRefunds());
        dispatch(allReturns());
    }, [dispatch]);

    let totalAmount = 0;
    orders &&
        orders.forEach(item => {
            totalAmount += item.totalPrice;
        });

    let totalReturnAmount = 0;
    returns &&
        returns.forEach(item => {
            totalReturnAmount += item.order.totalPrice;
        });

    const lineState = {
        labels: ['Orders', 'Returns'],
        datasets: [
            {
                label: 'Orders',
                backgroundColor: 'rgba(0, 166, 180, 0.4)', // Light Blue with opacity
                borderColor: '#00A6B4', // Light Blue
                borderWidth: 2,
                fill: true, // Fill the area below the line
                data: [0, totalAmount] // Positive value for orders
            }
            // {
            //     label: 'Returns',
            //     backgroundColor: 'rgba(255, 99, 71, 0.4)', // Light Blue with opacity
            //     borderColor: 'rgba(70, 117, 218, 0.932)', // Light Yellow
            //     borderWidth: 2,
            //     fill: true, // Fill the area below the line
            //     data: [0, totalReturnAmount] // Positive value for orders
            // }
        ]
    };

    const doughnutState1 = {
        labels: ['Out of Stock', 'InStock'],
        datasets: [
            {
                backgroundColor: ['#00A6B4', '#6800B4'],
                hoverBackgroundColor: ['#4B5000', '#35014F'],
                data: [outOfStock, products?.length - outOfStock]
            }
        ]
    };

    const doughnutState2 = {
        labels: ['Orders', 'Returns'],
        datasets: [
            {
                backgroundColor: ['#4eb3d3', '#81c784'], // Bright background colors
                hoverBackgroundColor: ['#63c7e6', '#a5d6a7'], // Bright hover colors
                data: [totalAmount, totalReturnAmount]
            }
        ]
    };

    return (
        <Fragment>
            {/* <div className='dashboard'> */}
            <MetaData title='Dashboard - Admin Panel' />

            <div className='dashboardContainer'>
                <Typography component='h1'>Analytics Dashboard</Typography>

                <div className='dashboardSummary'>
                    <div>
                        <p>
                            Total Amount <br /> ₹{totalAmount}
                        </p>
                        <p>
                            Total Return Amount <br /> ₹{totalReturnAmount}
                        </p>
                        {/* <p>
                                Total Net Amount <br /> ₹{totalNetAmount}
                            </p> */}
                    </div>

                    <div className='dashboardSummaryBox2'>
                        <Link to='/admin/products'>
                            <p>Products</p>
                            <p>{products && products?.length}</p>
                        </Link>
                        <Link to='/admin/orders'>
                            <p>Orders</p>
                            <p>{orders && orders?.length}</p>
                        </Link>
                        <Link to='/admin/users'>
                            <p>Users</p>
                            <p>{users && users?.length}</p>
                        </Link>
                        <Link to='/admin/returns'>
                            <p>Returns</p>
                            <p>{returns && returns?.length}</p>
                        </Link>
                        <Link to='/admin/refunds'>
                            <p>Refunds</p>
                            <p>{refunds && refunds?.length}</p>
                        </Link>
                    </div>
                </div>

                <div className='lineChart'>
                    <Line data={lineState} />
                </div>
                <div className='doughnutChartsContainer'>
                    <div className='doughnutChart1'>
                        <Doughnut data={doughnutState1} />
                    </div>

                    <div className='doughnutChart2'>
                        <Doughnut data={doughnutState2} />
                    </div>
                </div>
            </div>
            {/* </div> */}
        </Fragment>
    );
};

export default Dashboard;

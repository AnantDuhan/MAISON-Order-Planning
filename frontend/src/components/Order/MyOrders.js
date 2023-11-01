import { Typography } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import LaunchIcon from '@material-ui/icons/Launch';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, myOrders } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';

import './MyOrders.css';

const MyOrders = () => {
    const dispatch = useDispatch();

    const { loading, error, orders } = useSelector(state => state.myOrders);
    const { user } = useSelector(state => state.user);

    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const columns = [
        { field: 'id', headerName: 'Order ID', minWidth: 150, flex: 0.4 }, // Extra minWidth and flex for ID
        {
            field: 'orderStatus',
            headerName: 'Order Status',
            minWidth: 120,
            flex: 0.3, // Equal minWidth and flex
            cellClassName: params => {
                const status = params.row.orderStatus;
                return status === 'Delivered' ? 'greenColor' : 'redColor';
            }
        },
        {
            field: 'refundStatus',
            headerName: 'Refund Status',
            minWidth: 120,
            flex: 0.3, // Equal minWidth and flex
            cellClassName: params => {
                const status = params.row.refundStatus;
                return status === 'Approved' || status === 'Refunded'
                    ? 'greenColor'
                    : status === 'Initiated' ||
                      status === 'Pending' ||
                      status === 'Rejected'
                    ? 'redColor'
                    : '';
            }
        },
        {
            field: 'itemsQty',
            headerName: 'Items Qty',
            type: 'number',
            minWidth: 120,
            flex: 0.3 // Equal minWidth and flex
        },
        {
            field: 'amount',
            headerName: 'Amount',
            type: 'number',
            minWidth: 120, // Equal minWidth and flex
            flex: 0.2 // Equal minWidth and flex
        },
        {
            field: 'actions',
            flex: 0.2,
            headerName: 'Actions',
            minWidth: 120,
            type: 'number',
            sortable: false,
            renderCell: params => {
                return (
                    <div className='actions-container'>
                        <Link onClick={() => setProgress(progress + 80)} to={`/order/${params.getValue(params.id, 'id')}`}>
                            <LaunchIcon />
                        </Link>
                    </div>
                );
            }
        }
    ];

    const rows = [];

    orders &&
        orders.forEach((item, index) => {
            rows.push({
                itemsQty: item.orderItems.length,
                id: item._id,
                orderStatus: item.orderStatus,
                refundStatus: item.refundStatus,
                amount: item.totalPrice,
            });
        });

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }

        dispatch(myOrders());
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error]);

    return (
        <Fragment>
            <MetaData title={`${user.name} - Orders`} />
            {loading ? (
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <div className='myOrdersPage'>
                    <h1 id='orderListHeading'>MY ORDERS</h1>
                    <div className='table-container'>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            pageSize={10}
                            rowsPerPageOptions={[10, 20, 30]}
                            // disableSelectionOnClick
                            className='myOrdersTable'
                            autoHeight
                        />
                    </div>
                    <Typography id='myOrdersHeading'>
                        {user.name}'s Orders
                    </Typography>
                </div>
            )}
        </Fragment>
    );
};

export default MyOrders;

import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DataGrid } from '@material-ui/data-grid';
import LaunchIcon from '@material-ui/icons/Launch';
import { clearErrors, allRefunds } from '../../actions/orderAction';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';
import MetaData from '../layout/MetaData';

import './RefundList.css';

const RefundList = () => {
    const dispatch = useDispatch();

    const { loading, error, refunds } = useSelector(state => state.allRefunds);

    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const columns = [
        { field: 'id', headerName: 'Refund ID', minWidth: 150, flex: 0.4 },
        { field: 'orderID', headerName: 'Order ID', minWidth: 150, flex: 0.4 },
        { field: 'customer', headerName: 'Customer', minWidth: 110, flex: 0.4 },
        {
            field: 'status',
            headerName: 'Status',
            minWidth: 120,
            flex: 0.4,
            cellClassName: params => {
                const status = params.row.status;
                return status === 'Completed' ? 'greenColor' : 'redColor';
            }
        },
        {
            field: 'requestDate',
            headerName: 'Request Date',
            type: 'date',
            minWidth: 130,
            flex: 0.5
        },
        {
            field: 'refundAmount',
            headerName: 'Refund Amount',
            type: 'number',
            minWidth: 150,
            flex: 0.5
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
                        <Link to={`/order/${params.getValue(params.id, 'id')}`}>
                            <LaunchIcon />
                        </Link>
                    </div>
                );
            }
        }
    ];

    const rows = [];

    console.log("REFUNDS", refunds);

    refunds &&
        refunds.forEach((item, index) => {
            rows.push({
                id: item._id,
                orderID: item.order._id,
                customer: item.order.user.name,
                status: item.status,
                requestDate: item.order.refundRequestedAt,
                refundAmount: item.order.totalPrice
            });
        });

    console.log('rows', refunds);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }

        dispatch(allRefunds());
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error]);

    return (
        <Fragment>
            <MetaData title='All Refunds' />
            {loading ? (
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <div className='allReturnsPage'>
                    <h1 id='returnsListHeading'>ALL REFUNDS</h1>
                    <div className='table-container'>
                        <DataGrid
                            rows={rows}
                            columns={columns}
                            pageSize={10}
                            rowsPerPageOptions={[10, 20, 30]}
                            className='allReturnsTable'
                            autoHeight
                        />
                    </div>
                </div>
            )}
        </Fragment>
    );
};

export default RefundList;

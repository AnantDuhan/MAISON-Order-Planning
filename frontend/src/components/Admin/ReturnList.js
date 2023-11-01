import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DataGrid } from '@material-ui/data-grid';
import LaunchIcon from '@material-ui/icons/Launch';
import { clearErrors, allReturns } from '../../actions/orderAction';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';
import MetaData from '../layout/MetaData';

import './ReturnList.css';

const ReturnList = () => {
    const dispatch = useDispatch();

    const { loading, error, returns } = useSelector(state => state.allReturns);

    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const columns = [
        { field: 'id', headerName: 'Return ID', minWidth: 150, flex: 0.4 },
        {
            field: 'orderID',
            headerName: 'Order ID',
            minWidth: 150,
            flex: 0.4
        },
        {
            field: 'productID',
            headerName: 'Product ID',
            minWidth: 150,
            flex: 0.4
        },
        {
            field: 'customer',
            headerName: 'Customer',
            minWidth: 110,
            flex: 0.4
        },
        {
            field: 'returnReason',
            headerName: 'Return Reason',
            minWidth: 200,
            flex: 0.5
        },
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
                const orderId = params.row.orderID; // Access the order ID from params.row
                return (
                    <div className='actions-container'>
                        <Link to={`/order/${orderId}`}>
                            <LaunchIcon />
                        </Link>
                    </div>
                );
            }
        }
    ];

    const rows = [];

    returns &&
        returns.forEach((item, index) => {

            console.log('item', item.products[0].product);

            let productIds;
            if (Array.isArray(item.products) && item.products.length > 1) {
                // If there are multiple products, render a dropdown
                productIds = (
                    <select>
                        {item.products.map(productObj => (
                            <option
                                key={productObj._id}
                                value={productObj._id}
                            >
                                {productObj.product}
                                {console.log("check",productObj.product.toString())}
                            </option>
                        ))}
                    </select>
                ).toString();
            } else {
                // If there is only one product, display its ID
                productIds = item.products[0].product;
            }

            rows.push({
                id: item._id,
                orderID: item.order._id,
                productID: productIds.toString(),
                customer: item.order.user.name,
                returnReason: item.reason,
                status: item.status,
                requestDate: item.requestedAt,
                refundAmount: item.order.totalPrice
            });
        });

    console.log('rows', returns);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }

        dispatch(allReturns());
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error]);

    return (
        <Fragment>
            <MetaData title='All Returns' />
            {loading ? (
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <div className='allReturnsPage'>
                    <h1 id='returnsListHeading'>ALL RETURNS</h1>
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

export default ReturnList;

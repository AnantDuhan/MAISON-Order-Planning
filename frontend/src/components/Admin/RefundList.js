import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LaunchIcon from '@mui/icons-material/Launch';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, allRefunds } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';

const RefundList = () => {
    const dispatch = useDispatch();
    const { loading, error, refunds } = useSelector(state => state.allRefunds);

    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(allRefunds());
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error]);

    const rows = (refunds || []).map(item => ({
        id: item._id,
        orderID: item.order?._id,
        customer: item.order?.user?.name,
        status: item.status,
        requestDate: item.order?.refundRequestedAt,
        refundAmount: item.order?.totalPrice,
    }));

    const columns = [
        { key: 'id', label: 'Refund ID', width: '1.2fr' },
        { key: 'orderID', label: 'Order ID', width: '1.2fr' },
        { key: 'customer', label: 'Customer', width: '1fr' },
        {
            key: 'status',
            label: 'Status',
            width: '0.8fr',
            tone: row => (row.status === 'Completed' ? 'text-success' : 'text-danger'),
        },
        {
            key: 'requestDate',
            label: 'Requested',
            width: '1fr',
            render: row => (row.requestDate ? String(row.requestDate).substring(0, 10) : '—'),
        },
        {
            key: 'refundAmount',
            label: 'Amount',
            align: 'right',
            width: '0.8fr',
            render: row => `₹${row.refundAmount ?? 0}`,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.5fr',
            render: row => (
                <Link to={`/order/${row.orderID}`} className='text-ink-soft hover:text-brass' title='View order'>
                    <LaunchIcon fontSize='small' />
                </Link>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Refunds · Admin' />
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <AdminPage title='All Refunds'>
                    <AdminTable columns={columns} rows={rows} emptyMessage='No refunds requested.' />
                </AdminPage>
            )}
        </Fragment>
    );
};

export default RefundList;

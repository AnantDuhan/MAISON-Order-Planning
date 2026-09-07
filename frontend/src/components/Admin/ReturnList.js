import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LaunchIcon from '@mui/icons-material/Launch';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, allReturns, updateReturnStatus } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';

const ReturnList = () => {
    const dispatch = useDispatch();
    const { loading, error, returns } = useSelector(state => state.allReturns);

    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const changeReturnStatus = (id, status) => {
        dispatch(updateReturnStatus(id, status))
            .then(() => toast.success('Return status updated'))
            .catch(error => toast.error(error.response?.data?.message || error.message));
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(allReturns());
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error]);

    const rows = (returns || []).map(item => {
        const products = Array.isArray(item.products) ? item.products : [];
        const firstProduct = products[0]?.product;
        const firstProductId = typeof firstProduct === 'object' ? firstProduct?._id : firstProduct;
        const productID =
            products.length > 1
            ? `${String(firstProductId ?? '—')} +${products.length - 1} more`
            : String(firstProductId ?? '—');
        const productName =
            products.length > 1
                ? `${products[0]?.product?.name || 'Unknown product'} +${products.length - 1} more`
                : products[0]?.product?.name || '—';

        return {
            id: item._id,
            orderID: item.order?._id,
            productID,
            productName,
            customer: item.order?.user?.name,
            returnReason: item.reason,
            status: item.status,
            requestDate: item.requestedAt,
            refundAmount: item.order?.totalPrice,
        };
    });

    const columns = [
        { key: 'id', label: 'Return ID', width: '1.1fr' },
        { key: 'orderID', label: 'Order ID', width: '1.1fr' },
        { key: 'productName', label: 'Product', width: '1.3fr' },
        { key: 'productID', label: 'Product ID', width: '1.1fr' },
        { key: 'customer', label: 'Customer', width: '0.9fr' },
        { key: 'returnReason', label: 'Reason', width: '1.3fr' },
        {
            key: 'status',
            label: 'Status',
            width: '0.8fr',
            render: row => (
                <select
                    value={row.status}
                    onChange={event => changeReturnStatus(row.id, event.target.value)}
                    className='border border-line bg-transparent px-2 py-1 font-sans text-xs text-ink'
                >
                    {['Pending', 'Approved', 'Rejected', 'Completed'].map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            ),
        },
        {
            key: 'requestDate',
            label: 'Requested',
            width: '0.9fr',
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
            <MetaData title='All Returns · Admin' />
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <AdminPage title='All Returns'>
                    <AdminTable columns={columns} rows={rows} emptyMessage='No returns requested.' />
                </AdminPage>
            )}
        </Fragment>
    );
};

export default ReturnList;

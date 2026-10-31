import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LaunchIcon from '@mui/icons-material/Launch';
import LoadingBar from 'react-top-loading-bar';
import Loader from '../layout/Loader/Loader';

import { clearErrors, allRefunds } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import { formatINR } from '../../utils/priceLabel';
import OrderItems, { itemsFor } from './shared/OrderItems';

const shortDate = value => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

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
        items: itemsFor({ order: item.order }),
        customer: item.order?.user?.name || '—',
        email: item.order?.user?.email || '',
        method: item.method === 'store-credit' ? 'Store credit' : 'Original payment',
        status: item.status,
        requestDate: item.order?.refundRequestedAt || item.initiatedAt,
        completedAt: item.completedAt,
        refundAmount: item.amount ?? item.order?.totalPrice,
    }));

    const statusTone = status => (status === 'Completed' ? 'text-success' : /fail|reject/i.test(status || '') ? 'text-danger' : 'text-brass');

    const orderLink = row => (row.orderID ? (
        <Link to={`/admin/order/${row.orderID}`} className='inline-flex items-center gap-1 font-sans text-xs text-ink-soft hover:text-brass' title='Open order'>
            #{row.orderID}
            <LaunchIcon sx={{ fontSize: 14 }} />
        </Link>
    ) : '—');

    const columns = [
        { key: 'items', label: 'Refunded', width: '2.4fr', render: row => <OrderItems items={row.items} /> },
        {
            key: 'customer',
            label: 'Customer',
            width: '1.2fr',
            render: row => (
                <span className='min-w-0'>
                    <span className='block truncate text-ink'>{row.customer}</span>
                    {row.email && <span className='block truncate text-xs text-ink-faint'>{row.email}</span>}
                </span>
            ),
        },
        { key: 'method', label: 'Refund to', width: '1fr' },
        {
            key: 'status',
            label: 'Status',
            width: '0.9fr',
            render: row => (
                <span>
                    <span className={`block ${statusTone(row.status)}`}>{row.status || '—'}</span>
                    {row.completedAt && <span className='block text-xs text-ink-faint'>{shortDate(row.completedAt)}</span>}
                </span>
            ),
        },
        { key: 'requestDate', label: 'Requested', width: '0.8fr', render: row => shortDate(row.requestDate) },
        { key: 'refundAmount', label: 'Amount', align: 'right', width: '0.7fr', render: row => formatINR(row.refundAmount ?? 0) },
        { key: 'actions', label: 'Order', align: 'right', width: '0.8fr', render: orderLink },
    ];

    // Phones and tablets.
    const renderCard = row => (
        <div className='border-b border-line py-5'>
            <div className='flex items-baseline justify-between gap-3'>
                <p className='font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>{shortDate(row.requestDate)} · {row.customer}</p>
                <p className='shrink-0 font-sans text-sm font-medium text-ink'>{formatINR(row.refundAmount ?? 0)}</p>
            </div>
            <div className='mt-3'><OrderItems items={row.items} max={3} /></div>
            <div className='mt-3 flex items-center justify-between gap-3 font-sans text-sm'>
                <span>
                    <span className={statusTone(row.status)}>{row.status || '—'}</span>
                    <span className='text-ink-faint'> · {row.method}</span>
                </span>
                {orderLink(row)}
            </div>
        </div>
    );

    return (
        <Fragment>
            <MetaData title='All Refunds · Admin' noIndex />
            {loading ? (
                <Fragment>
                    <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
                    <Loader label='Loading refunds' />
                </Fragment>
            ) : (
                <AdminPage title='All Refunds'>
                    <AdminTable columns={columns} rows={rows} renderCard={renderCard} emptyMessage='No refunds requested.' />
                </AdminPage>
            )}
        </Fragment>
    );
};

export default RefundList;

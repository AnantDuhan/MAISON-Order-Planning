import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LaunchIcon from '@mui/icons-material/Launch';

import { clearErrors, allReturns, updateReturnStatus } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import { useLoadOnce } from './shared/useLoadOnce';
import { formatINR } from '../../utils/priceLabel';
import OrderItems, { itemsFor } from './shared/OrderItems';

const shortDate = value => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const ReturnList = () => {
    const dispatch = useDispatch();
    const { error, returns } = useSelector(state => state.allReturns);
    // Fetched once on opening; the page and its header stay put while it loads.
    const { loaded } = useLoadOnce(() => dispatch(allReturns()));


    const changeReturnStatus = (id, status) => {
        dispatch(updateReturnStatus(id, status))
            .then(() => toast.success('Return status updated'))
            .catch(error => toast.error(error.response?.data?.message || error.message));
    };

    // Errors show a toast; they used to trigger another fetch, which looped
    // while the API failed.
    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
    }, [dispatch, error]);

    const rows = (loaded ? returns || [] : []).map(item => ({
        id: item._id,
        orderID: item.order?._id,
        items: itemsFor({ order: item.order, products: item.products }),
        customer: item.order?.user?.name || '—',
        email: item.order?.user?.email || '',
        returnReason: item.reason,
        details: item.details || '',
        status: item.status,
        requestDate: item.requestedAt,
        // A return covers the whole order (Refunds policy), so the order total.
        refundAmount: item.order?.totalPrice,
    }));

    const statusSelect = row => (
        <select
            value={row.status}
            onChange={event => changeReturnStatus(row.id, event.target.value)}
            aria-label={`Status of return ${row.id}`}
            className='border border-line bg-transparent px-2 py-1 font-sans text-xs text-ink'
        >
            {['Pending', 'Approved', 'Rejected', 'Completed'].map(status => (
                <option key={status} value={status}>{status}</option>
            ))}
        </select>
    );

    const orderLink = row => (row.orderID ? (
        <Link to={`/admin/order/${row.orderID}`} className='inline-flex items-center gap-1 font-sans text-xs text-ink-soft hover:text-brass' title='Open order'>
            #{row.orderID}
            <LaunchIcon sx={{ fontSize: 14 }} />
        </Link>
    ) : '—');

    const columns = [
        { key: 'items', label: 'Returned', width: '2.4fr', render: row => <OrderItems items={row.items} /> },
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
        {
            key: 'returnReason',
            label: 'Reason',
            width: '1.3fr',
            render: row => (
                <span>
                    <span className='block'>{row.returnReason}</span>
                    {row.details && <span className='mt-0.5 block line-clamp-2 text-xs text-ink-faint' title={row.details}>“{row.details}”</span>}
                </span>
            ),
        },
        { key: 'status', label: 'Status', width: '0.9fr', render: statusSelect },
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
            <p className='mt-3 font-sans text-sm text-ink'>{row.returnReason}</p>
            {row.details && <p className='mt-1 font-sans text-xs text-ink-faint'>“{row.details}”</p>}
            <div className='mt-3 flex items-center justify-between gap-3'>
                {statusSelect(row)}
                {orderLink(row)}
            </div>
        </div>
    );

    return (
        <Fragment>
            <MetaData title='All Returns · Admin' noIndex />
            <AdminPage title='All Returns'>
                <AdminTable columns={columns} rows={rows} renderCard={renderCard} loading={!loaded} emptyMessage='No returns requested.' />
            </AdminPage>
        </Fragment>
    );
};

export default ReturnList;

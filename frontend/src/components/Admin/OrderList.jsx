import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteOrder, getAllOrders } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import { formatINR } from '../../utils/priceLabel';

const refundTone = status =>
    status === 'Approved' || status === 'Refunded'
        ? 'text-success'
        : ['Initiated', 'Pending', 'Rejected', 'Processing'].includes(status)
        ? 'text-danger'
        : 'text-ink-soft';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days past its delivery estimate for an undelivered, unrefunded order; 0 if on time. */
const daysLate = order => {
    if (!order.estimatedDeliveryDate || ['Delivered', 'Cancelled'].includes(order.orderStatus) || order.isRefunded) return 0;
    const due = new Date(order.estimatedDeliveryDate);
    due.setHours(23, 59, 59, 999);
    return Math.max(0, Math.ceil((Date.now() - due.getTime()) / DAY_MS));
};

const OrderList = () => {
    const [lateOnly, setLateOnly] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, orders } = useSelector(state => state.allOrders);
    const { error: deleteError, isDeleted } = useSelector(state => state.order);

    const deleteOrderHandler = id => dispatch(deleteOrder(id));

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (deleteError) {
            toast.error(deleteError);
            dispatch(clearErrors());
        }
        if (isDeleted) {
            toast.success('Order Deleted Successfully');
            navigate('/admin/orders');
            dispatch({ type: DELETE_ORDER_RESET });
        }
        dispatch(getAllOrders());
    }, [dispatch, error, deleteError, navigate, isDeleted]);

    const allRows = (orders || []).map(item => ({
        id: item._id,
        name: item.orderItems?.[0]?.name || '—',
        itemsQty: item.orderItems?.length || 0,
        amount: item.totalPrice,
        status: item.orderStatus,
        refundStatus: item.refundStatus,
        late: daysLate(item),
        memberTier: item.memberTier || null,
    }));
    const lateCount = allRows.filter(r => r.late > 0).length;
    // Late orders first so they can't hide on page 3, then members' orders
    // still to ship (priority dispatch), then everything else.
    const rank = r => (r.late > 0 ? 2 : r.memberTier && r.status === 'Processing' ? 1 : 0);
    const rows = (lateOnly ? allRows.filter(r => r.late > 0) : allRows)
        .slice()
        .sort((a, b) => rank(b) - rank(a));

    const columns = [
        { key: 'id', label: 'Order ID', width: '1.4fr' },
        { key: 'name', label: 'Product', width: '1.2fr' },
        {
            key: 'status',
            label: 'Status',
            width: '0.8fr',
            tone: row => (row.status === 'Delivered' ? 'text-success' : row.late ? 'text-danger' : 'text-ink'),
            render: row => (
                <span>
                    {row.status}
                    {row.late > 0 && (
                        <span className='ml-2 inline-block border border-danger/40 bg-danger/10 px-1.5 py-0.5 align-middle font-sans text-[0.6rem] uppercase tracking-luxe text-danger'>
                            {row.late}d late
                        </span>
                    )}
                    {row.memberTier && (
                        <span title='Member order: dispatch first' className='ml-2 inline-block border border-brass/50 bg-brass/10 px-1.5 py-0.5 align-middle font-sans text-[0.6rem] uppercase tracking-luxe text-brass'>
                            {row.memberTier === 'plus' ? 'Plus' : 'Essential'}
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: 'refundStatus',
            label: 'Refund',
            width: '0.8fr',
            tone: row => refundTone(row.refundStatus),
            render: row => row.refundStatus || '—',
        },
        { key: 'itemsQty', label: 'Items', align: 'center', width: '0.5fr' },
        {
            key: 'amount',
            label: 'Amount',
            align: 'right',
            width: '0.8fr',
            render: row => formatINR(row.amount),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.7fr',
            render: row => (
                <span className='inline-flex items-center gap-4'>
                    <Link to={`/admin/order/${row.id}`} className='text-ink-soft hover:text-brass' title='Process'>
                        <EditIcon fontSize='small' />
                    </Link>
                    <button
                        onClick={() => deleteOrderHandler(row.id)}
                        className='text-ink-soft hover:text-danger'
                        title='Delete'
                    >
                        <DeleteIcon fontSize='small' />
                    </button>
                </span>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Orders · Admin' />
            <AdminPage title='All Orders'>
                {lateCount > 0 && (
                    <div className='mb-6 flex flex-col gap-3 border border-danger/40 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between'>
                        <p className='font-sans text-sm text-ink'>
                            <span className='font-medium text-danger'>{lateCount} {lateCount === 1 ? 'order is' : 'orders are'} past the delivery date</span>
                            {' '}and not delivered. Customers see these as running late — ship them or contact the customer.
                        </p>
                        <button type='button' onClick={() => setLateOnly(v => !v)} className='btn-outline shrink-0 !px-4 !py-2.5'>
                            {lateOnly ? 'Show all orders' : 'Show late only'}
                        </button>
                    </div>
                )}
                <AdminTable columns={columns} rows={rows} emptyMessage={lateOnly ? 'No late orders.' : 'No orders yet.'} />
            </AdminPage>
        </Fragment>
    );
};

export default OrderList;

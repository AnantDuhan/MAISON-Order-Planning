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
import ConfirmDelete from './shared/ConfirmDelete';
import { formatINR } from '../../utils/priceLabel';

const refundTone = status =>
    status === 'Approved' || status === 'Refunded'
        ? 'text-success'
        : ['Initiated', 'Pending', 'Rejected', 'Processing'].includes(status)
        ? 'text-danger'
        : 'text-ink-soft';

const DAY_MS = 24 * 60 * 60 * 1000;

const itemImage = item => (item?.images || []).find(img => img?.url)?.url || item?.image || null;
const shortDate = value => (value
    ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '');

const statusTone = row => (row.status === 'Delivered' ? 'border-success/40 bg-success/10 text-success'
    : row.late ? 'border-danger/40 bg-danger/10 text-danger'
        : 'border-line bg-surface text-ink');

const Badge = ({ className, title, children }) => (
    <span title={title} className={`inline-block border px-1.5 py-0.5 font-sans text-[0.6rem] uppercase tracking-luxe ${className}`}>
        {children}
    </span>
);

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
        image: itemImage(item.orderItems?.[0]),
        more: Math.max(0, (item.orderItems?.length || 0) - 1),
        placedAt: item.createdAt,
        city: item.shippingInfo?.city || '',
    }));
    const lateCount = allRows.filter(r => r.late > 0).length;
    // Late orders first so they can't hide on page 3, then Plus orders
    // still to ship (priority dispatch), then everything else.
    const rank = r => (r.late > 0 ? 2 : r.memberTier === 'plus' && r.status === 'Processing' ? 1 : 0);
    const rows = (lateOnly ? allRows.filter(r => r.late > 0) : allRows)
        .slice()
        .sort((a, b) => rank(b) - rank(a));

    // Phones and tablets: what to ship, how urgent, and for how much.
    const renderCard = row => (
        <div className='py-5'>
            <Link to={`/admin/order/${row.id}`} className='flex gap-4'>
                <span className='h-20 w-16 shrink-0 overflow-hidden bg-surface'>
                    {row.image && <img src={row.image} alt='' loading='lazy' decoding='async' className='h-full w-full object-cover' />}
                </span>
                <span className='min-w-0 flex-1'>
                    <span className='flex items-baseline justify-between gap-3'>
                        <span className='truncate font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                            #{row.id.slice(-8)}{row.placedAt ? ` · ${shortDate(row.placedAt)}` : ''}{row.city ? ` · ${row.city}` : ''}
                        </span>
                        <span className='shrink-0 font-sans text-sm font-medium text-ink'>{formatINR(row.amount)}</span>
                    </span>
                    <span className='mt-1 line-clamp-2 font-sans text-sm text-ink'>
                        {row.name}{row.more > 0 && <span className='text-ink-soft'> + {row.more} more</span>}
                    </span>
                    <span className='mt-2 flex flex-wrap gap-1.5'>
                        <Badge className={statusTone(row)}>{row.status}</Badge>
                        {row.late > 0 && <Badge className='border-danger/40 bg-danger/10 text-danger'>{row.late}d late</Badge>}
                        {row.memberTier && (
                            <Badge className='border-brass/50 bg-brass/10 text-brass' title={row.memberTier === 'plus' ? 'Plus order: dispatch first' : 'Essential member'}>
                                {row.memberTier === 'plus' ? 'Plus' : 'Essential'}
                            </Badge>
                        )}
                        {row.refundStatus && (
                            <Badge className={`border-line ${refundTone(row.refundStatus)}`}>Refund {row.refundStatus}</Badge>
                        )}
                    </span>
                </span>
            </Link>
            <div className='mt-3 flex flex-wrap items-center gap-2 pl-20'>
                <Link
                    to={`/admin/order/${row.id}`}
                    className='inline-flex min-h-[40px] items-center gap-1.5 border border-line px-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink transition-colors hover:border-brass hover:text-brass'
                >
                    <EditIcon sx={{ fontSize: 16 }} />
                    Process
                </Link>
                <ConfirmDelete variant='button' what={`order ${row.id}`} onConfirm={() => deleteOrderHandler(row.id)} />
            </div>
        </div>
    );

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
                        <span title={row.memberTier === 'plus' ? 'Plus order: dispatch first' : 'Essential member'} className='ml-2 inline-block border border-brass/50 bg-brass/10 px-1.5 py-0.5 align-middle font-sans text-[0.6rem] uppercase tracking-luxe text-brass'>
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
                    <ConfirmDelete what={`order ${row.id}`} onConfirm={() => deleteOrderHandler(row.id)} />
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
                <AdminTable columns={columns} rows={rows} renderCard={renderCard} emptyMessage={lateOnly ? 'No late orders.' : 'No orders yet.'} />
            </AdminPage>
        </Fragment>
    );
};

export default OrderList;

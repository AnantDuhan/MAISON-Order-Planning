import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteOrder, getAllOrders } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import { useLoadOnce } from './shared/useLoadOnce';
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

const toRow = item => ({
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
    customer: typeof item.user === 'object' && item.user ? item.user.name : item.guest?.name ? `${item.guest.name} (guest)` : '',
    email: typeof item.user === 'object' && item.user ? item.user.email : item.guest?.email || '',
});

/*
 * One page at a time from the server (services/orderListing.js). On page 1
 * the orders that need action now (late, then Plus orders to ship) sit in
 * their own table above the rest, so they can't hide on a later page.
 */
const OrderList = () => {
    const [view, setView] = useState('all');
    const [page, setPage] = useState(1);
    const dispatch = useDispatch();

    const { error, orders, pinned, pages, total, counts } = useSelector(state => state.allOrders);
    const { error: deleteError, isDeleted } = useSelector(state => state.order);

    const deleteOrderHandler = id => dispatch(deleteOrder(id));

    // Errors only show a toast; they used to trigger another fetch, which
    // looped while the API failed.
    const { loaded, reload } = useLoadOnce(() => dispatch(getAllOrders({ page, view })));

    // A new page or view fetches again (the first load is useLoadOnce's).
    const firstRun = useRef(true);
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        reload();
    }, [page, view, reload]);

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
            dispatch({ type: DELETE_ORDER_RESET });
            reload();
        }
    }, [dispatch, error, deleteError, isDeleted, reload]);

    const rows = (loaded ? orders || [] : []).map(toRow);
    const pinnedRows = (loaded && view === 'all' ? pinned || [] : []).map(toRow);
    const lateCount = counts?.late || 0;
    const plusCount = counts?.plusToShip || 0;

    const switchView = next => {
        setView(next);
        setPage(1);
    };

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
        {
            key: 'id',
            label: 'Order',
            width: '1fr',
            render: row => (
                <span>
                    <span className='block text-ink'>{row.id}</span>
                    {row.placedAt && <span className='block text-xs text-ink-faint'>{shortDate(row.placedAt)}</span>}
                </span>
            ),
        },
        {
            key: 'customer',
            label: 'Customer',
            width: '1.2fr',
            render: row => (row.customer ? (
                <span className='min-w-0'>
                    <span className='block truncate text-ink'>{row.customer}</span>
                    <span className='block truncate text-xs text-ink-faint'>{row.city || row.email}</span>
                </span>
            ) : <span className='text-ink-faint'>{row.city || '—'}</span>),
        },
        {
            key: 'name',
            label: 'Items',
            width: '1.4fr',
            render: row => (
                <span className='flex min-w-0 items-center gap-3'>
                    {row.image && <img src={row.image} alt='' loading='lazy' className='h-10 w-8 shrink-0 object-cover' />}
                    <span className='min-w-0'>
                        <span className='line-clamp-2'>{row.name}</span>
                        {row.more > 0 && <span className='block text-xs text-ink-faint'>+ {row.more} more</span>}
                    </span>
                </span>
            ),
        },
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
            <MetaData title='All Orders · Admin' noIndex />
            <AdminPage title='All Orders'>
                {lateCount > 0 && (
                    <div className='mb-6 flex flex-col gap-3 border border-danger/40 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between'>
                        <p className='font-sans text-sm text-ink'>
                            <span className='font-medium text-danger'>{lateCount} {lateCount === 1 ? 'order is' : 'orders are'} past the delivery date</span>
                            {' '}and not delivered. Customers see these as running late — ship them or contact the customer.
                        </p>
                        <button type='button' onClick={() => switchView(view === 'late' ? 'all' : 'late')} className='btn-outline shrink-0 !px-4 !py-2.5'>
                            {view === 'late' ? 'Show all orders' : 'Show late only'}
                        </button>
                    </div>
                )}

                {pinnedRows.length > 0 && (
                    <section aria-labelledby='pinned-orders' className='mb-12'>
                        <h2 id='pinned-orders' className='eyebrow mb-4'>
                            Needs action now · {lateCount > 0 && `${lateCount} late`}{lateCount > 0 && plusCount > 0 && ' · '}{plusCount > 0 && `${plusCount} Plus to ship`}
                        </h2>
                        <AdminTable columns={columns} rows={pinnedRows} renderCard={renderCard} pageSize={50} />
                    </section>
                )}

                {view === 'all' && pinnedRows.length > 0 && (
                    <h2 className='eyebrow mb-4'>All other orders · {total}</h2>
                )}
                <AdminTable
                    columns={columns}
                    rows={rows}
                    renderCard={renderCard}
                    loading={!loaded}
                    page={page}
                    totalPages={pages}
                    onPageChange={setPage}
                    emptyMessage={view === 'late' ? 'No late orders.' : pinnedRows.length ? 'No other orders.' : 'No orders yet.'}
                />
            </AdminPage>
        </Fragment>
    );
};

export default OrderList;

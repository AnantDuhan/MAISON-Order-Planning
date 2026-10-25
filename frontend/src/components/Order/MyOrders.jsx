import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import Loader from '../layout/Loader/Loader';

import { clearErrors, myOrders } from '../../actions/orderAction';
import { formatINR } from '../../utils/priceLabel';
import MetaData from '../layout/MetaData';

const formatDay = value =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

const STATUS_TONE = {
    Delivered: 'border-success/30 bg-success/10 text-success',
    Shipped: 'border-brass/40 bg-brass/10 text-brass',
    Cancelled: 'border-danger/30 bg-danger/10 text-danger',
};
const REFUND_CHIP = {
    Refunded: ['Refunded', 'border-success/30 bg-success/10 text-success'],
    Processing: ['Refund in progress', 'border-brass/40 bg-brass/10 text-brass'],
    Initiated: ['Refund in progress', 'border-brass/40 bg-brass/10 text-brass'],
    Rejected: ['Refund declined', 'border-danger/30 bg-danger/10 text-danger'],
};

const Chip = ({ tone, children }) => (
    <span className={`inline-flex items-center whitespace-nowrap border px-2.5 py-1 font-sans text-[0.62rem] uppercase tracking-luxe ${tone || 'border-line bg-surface-2 text-ink-soft'}`}>
        {children}
    </span>
);

const itemImage = item => (item.images || []).find(img => img?.url)?.url || item.image || null;

/** Up to three product photos, overlapped like a fanned stack. */
const PhotoStack = ({ items }) => {
    const shown = items.slice(0, 3);
    const extra = items.length - shown.length;
    return (
        <div className='relative flex shrink-0 items-center'>
            {shown.map((item, i) => {
                const src = itemImage(item);
                return (
                    <div
                        key={`${item.product}-${item.variant || i}`}
                        className={`relative h-[4.5rem] w-14 overflow-hidden border border-line bg-surface-2 shadow-[0_2px_8px_rgba(0,0,0,0.18)] sm:h-24 sm:w-20 ${i > 0 ? '-ml-9 sm:-ml-12' : ''}`}
                        style={{ zIndex: shown.length - i }}
                    >
                        {src ? (
                            <img src={src} alt={i === 0 ? item.name : ''} loading='lazy' decoding='async' className='h-full w-full object-cover' />
                        ) : (
                            <div className='grid h-full w-full place-items-center text-ink-faint'>
                                <ShoppingBagOutlinedIcon fontSize='small' />
                            </div>
                        )}
                    </div>
                );
            })}
            {extra > 0 && (
                <span className='absolute -bottom-1.5 -right-1.5 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 font-sans text-[0.65rem] font-medium text-canvas ring-2 ring-surface'>
                    +{extra}
                </span>
            )}
        </div>
    );
};

const deliveryLine = order => {
    if (order.orderStatus === 'Delivered') {
        const on = formatDay(order.DeliveredAt);
        return on ? `Delivered on ${on}` : 'Delivered';
    }
    if (order.orderStatus === 'Cancelled') return null;
    const by = formatDay(order.estimatedDeliveryDate);
    return by ? `Expected by ${by}` : null;
};

const OrderCard = ({ order }) => {
    const items = order.orderItems || [];
    const first = items[0];
    const units = items.reduce((n, item) => n + (Number(item.quantity) || 0), 0);
    const others = items.length - 1;
    const refund = REFUND_CHIP[order.refundStatus] || null;
    const delivery = deliveryLine(order);

    return (
        <Link
            to={`/order/${order._id}`}
            className='group block border border-line bg-surface p-4 transition-colors duration-300 hover:border-brass/60 sm:p-6'
            aria-label={`Order ${order._id}, ${order.orderStatus}, ${formatINR(order.totalPrice)}`}
        >
            {/* Placed date + status */}
            <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                    <p className='font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                        Placed {formatDay(order.createdAt) || ''}
                    </p>
                    <p className='mt-1 font-sans text-xs text-ink-faint'>Order #{order._id}</p>
                </div>
                <div className='flex flex-wrap justify-end gap-1.5'>
                    <Chip tone={STATUS_TONE[order.orderStatus]}>{order.orderStatus}</Chip>
                    {refund && <Chip tone={refund[1]}>{refund[0]}</Chip>}
                </div>
            </div>

            {/* Photos + what was bought */}
            <div className='mt-4 flex items-center gap-4'>
                <PhotoStack items={items} />
                <div className='min-w-0 flex-1'>
                    <p className='line-clamp-2 font-display text-lg leading-snug text-ink sm:text-xl'>
                        {first?.name || 'Order'}
                    </p>
                    {first?.variantLabel && (
                        <p className='mt-0.5 truncate font-sans text-xs text-ink-soft'>{first.variantLabel}</p>
                    )}
                    <p className='mt-1 font-sans text-xs text-ink-faint'>
                        {others > 0 ? `+ ${others} more ${others === 1 ? 'item' : 'items'} · ` : ''}
                        {units} {units === 1 ? 'piece' : 'pieces'}
                    </p>
                </div>
                <ChevronRightIcon className='shrink-0 text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brass' />
            </div>

            {/* Total + delivery */}
            <div className='mt-4 flex items-end justify-between gap-3 border-t border-line pt-4'>
                <p className='font-sans text-xs text-ink-soft'>{delivery || ''}</p>
                <p className='font-display text-xl font-medium text-ink'>{formatINR(order.totalPrice)}</p>
            </div>
        </Link>
    );
};

const MyOrders = () => {
    const dispatch = useDispatch();

    const { loading, error } = useSelector(state => state.myOrders);
    const orders = useSelector(state => {
        const value = state.myOrders.orders;
        return Array.isArray(value) ? value : [];
    });
    const { user } = useSelector(state => state.user);

    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(myOrders());
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, error]);

    // Newest first.
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return (
        <Fragment>
            <MetaData title={`${user?.name} · Orders`} />
            {loading ? (
                <Fragment>
                    <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
                    <Loader label='Finding your orders' />
                </Fragment>
            ) : (
                <div className='editorial-shell py-14'>
                    <div className='mb-10 text-center'>
                        <p className='eyebrow'>{user?.name}</p>
                        <h1 className='heading-display mt-3 text-display'>My Orders</h1>
                        {sorted.length > 0 && (
                            <p className='mt-3 font-sans text-sm text-ink-faint'>
                                {sorted.length} {sorted.length === 1 ? 'order' : 'orders'}
                            </p>
                        )}
                    </div>

                    {sorted.length === 0 ? (
                        <div className='flex flex-col items-center py-24 text-center'>
                            <p className='font-display text-2xl italic text-ink-faint'>
                                You haven't placed any orders yet.
                            </p>
                            <Link to='/products' className='btn-outline mt-8'>Start Shopping</Link>
                        </div>
                    ) : (
                        <div className='mx-auto grid max-w-5xl gap-4 lg:grid-cols-2 lg:gap-6'>
                            {sorted.map(order => (
                                <OrderCard key={order._id} order={order} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Fragment>
    );
};

export default MyOrders;

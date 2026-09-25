import LaunchIcon from '@mui/icons-material/Launch';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, myOrders } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';

const statusTone = status => {
    if (status === 'Delivered' || status === 'Approved' || status === 'Refunded')
        return 'text-success';
    if (status === 'Initiated' || status === 'Pending' || status === 'Rejected')
        return 'text-danger';
    return 'text-ink-soft';
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

    return (
        <Fragment>
            <MetaData title={`${user?.name} · Orders`} />
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <div className='editorial-shell py-14'>
                    <div className='mb-12 text-center'>
                        <p className='eyebrow'>{user?.name}</p>
                        <h1 className='heading-display mt-3 text-display'>My Orders</h1>
                    </div>

                    {orders.length === 0 ? (
                        <div className='flex flex-col items-center py-24 text-center'>
                            <p className='font-display text-2xl italic text-ink-faint'>
                                You haven't placed any orders yet.
                            </p>
                            <Link to='/products' className='btn-outline mt-8'>Start Shopping</Link>
                        </div>
                    ) : (
                        <Fragment>
                            {/* Column headers (desktop) */}
                            <div className='hidden grid-cols-[1.4fr_1fr_1fr_0.6fr_0.8fr_60px] gap-4 border-b border-line pb-4 lg:grid'>
                                <span className='eyebrow'>Order ID</span>
                                <span className='eyebrow'>Order Status</span>
                                <span className='eyebrow'>Refund Status</span>
                                <span className='eyebrow text-center'>Items</span>
                                <span className='eyebrow text-right'>Amount</span>
                                <span />
                            </div>

                            <div className='divide-y divide-line'>
                                {orders.map(item => (
                                    <div
                                        key={item._id}
                                        className='grid grid-cols-2 gap-4 py-6 lg:grid-cols-[1.4fr_1fr_1fr_0.6fr_0.8fr_60px] lg:items-center'
                                    >
                                        <div className='col-span-2 lg:col-span-1'>
                                            <span className='lg:hidden eyebrow block'>Order ID</span>
                                            <span className='break-all font-sans text-sm text-ink'>{item._id}</span>
                                        </div>

                                        <div>
                                            <span className='lg:hidden eyebrow block'>Order Status</span>
                                            <span className={`font-sans text-sm ${statusTone(item.orderStatus)}`}>
                                                {item.orderStatus}
                                            </span>
                                        </div>

                                        <div>
                                            <span className='lg:hidden eyebrow block'>Refund Status</span>
                                            <span className={`font-sans text-sm ${statusTone(item.refundStatus)}`}>
                                                {item.refundStatus || '—'}
                                            </span>
                                        </div>

                                        <div className='lg:text-center'>
                                            <span className='lg:hidden eyebrow block'>Items</span>
                                            <span className='font-sans text-sm text-ink-soft'>
                                                {item.orderItems.length}
                                            </span>
                                        </div>

                                        <div className='lg:text-right'>
                                            <span className='lg:hidden eyebrow block'>Amount</span>
                                            <span className='font-display text-lg font-medium text-ink'>
                                                ₹{item.totalPrice}
                                            </span>
                                        </div>

                                        <div className='col-span-2 lg:col-span-1 lg:text-right'>
                                            <Link
                                                to={`/order/${item._id}`}
                                                onClick={() => setProgress(progress + 80)}
                                                className='inline-flex items-center gap-2 font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:underline lg:gap-0'
                                            >
                                                <span className='lg:hidden'>View Order</span>
                                                <LaunchIcon fontSize='small' />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Fragment>
                    )}
                </div>
            )}
        </Fragment>
    );
};

export default MyOrders;

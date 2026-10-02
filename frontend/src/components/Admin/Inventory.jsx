import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';

const STATUS = {
    out: { label: 'Out of stock', className: 'text-danger' },
    low: { label: 'Low', className: 'text-brass' },
    ok: { label: 'In stock', className: 'text-success' },
};

const Stat = ({ label, value, dark }) => (
    <div className={`border border-line px-6 py-6 ${dark ? 'bg-ink text-canvas' : 'bg-surface'}`}>
        <p className={`eyebrow ${dark ? '!text-brass-soft' : ''}`}>{label}</p>
        <p className={`mt-3 font-display text-4xl ${dark ? '' : 'text-ink'}`}>{value ?? '—'}</p>
    </div>
);

const Inventory = () => {
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('attention');

    useEffect(() => {
        axios.get('/api/v1/admin/inventory')
            .then(({ data: body }) => setData(body))
            .catch(error => toast.error(error.response?.data?.message || 'Could not load inventory.'));
    }, []);

    const rows = useMemo(() => {
        const all = data?.products || [];
        if (filter === 'attention') return all.filter(r => r.status !== 'ok' || r.waitingForRestock > 0);
        if (filter === 'held') return all.filter(r => r.heldInCheckout > 0);
        return all;
    }, [data, filter]);

    const summary = data?.summary || {};

    return (
        <div className='editorial-shell py-12'>
            <MetaData title='Inventory · Admin' />
            <div className='mb-10'>
                <p className='eyebrow'>Admin</p>
                <h1 className='heading-display mt-2 text-display'>Inventory</h1>
                <p className='mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft'>
                    Stock shown is what can be sold right now. Units in an unfinished checkout are held for
                    up to 30 minutes and return to stock automatically if the payment isn’t completed.
                </p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Stat dark label='Out of stock' value={summary.outOfStock} />
                <Stat label='Running low' value={summary.lowStock} />
                <Stat label='Units in checkout' value={summary.unitsInCheckout} />
                <Stat label='Customers waiting' value={summary.customersWaiting} />
            </div>

            {data?.shortfallOrders?.length > 0 && (
                <div className='mt-10 border border-danger/40 bg-surface p-6'>
                    <p className='font-sans text-[0.72rem] uppercase tracking-luxe text-danger'>
                        Paid orders without stock · {data.shortfallOrders.length}
                    </p>
                    <p className='mt-2 font-sans text-sm text-ink-soft'>
                        These customers paid after their reservation expired and the last units sold to someone
                        else. Restock and ship, or refund them.
                    </p>
                    <ul className='mt-4 divide-y divide-line'>
                        {data.shortfallOrders.map(order => (
                            <li key={order._id} className='flex flex-wrap items-center justify-between gap-3 py-3'>
                                <span className='font-sans text-sm text-ink'>
                                    {order.orderItems.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                                </span>
                                <Link to={`/admin/order/${order._id}`} className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass'>
                                    Open order →
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className='mt-10 flex flex-wrap gap-2'>
                {[
                    ['attention', 'Needs attention'],
                    ['held', 'In checkout'],
                    ['all', 'All products'],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`border px-4 py-2 font-sans text-[0.68rem] uppercase tracking-luxe ${filter === key ? 'border-ink bg-ink text-canvas' : 'border-line text-ink-soft hover:border-ink'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className='mt-5 overflow-x-auto border border-line bg-surface'>
                <table className='w-full min-w-[720px] font-sans text-sm'>
                    <thead>
                        <tr className='border-b border-line text-left text-[0.66rem] uppercase tracking-luxe text-ink-faint'>
                            <th className='px-5 py-3 font-normal'>Product</th>
                            <th className='px-5 py-3 font-normal'>Status</th>
                            <th className='px-5 py-3 text-right font-normal'>Available</th>
                            <th className='px-5 py-3 text-right font-normal'>Alert at</th>
                            <th className='px-5 py-3 text-right font-normal'>In checkout</th>
                            <th className='px-5 py-3 text-right font-normal'>Waiting</th>
                            <th className='px-5 py-3' />
                        </tr>
                    </thead>
                    <tbody className='divide-y divide-line'>
                        {rows.map(row => (
                            <tr key={row._id}>
                                <td className='px-5 py-3'>
                                    <div className='flex items-center gap-3'>
                                        {row.image && <img src={row.image} alt='' className='h-10 w-10 border border-line object-cover' />}
                                        <div>
                                            <p className='text-ink'>{row.name}</p>
                                            <p className='text-xs text-ink-faint'>{row.category}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className={`px-5 py-3 text-[0.7rem] uppercase tracking-luxe ${STATUS[row.status].className}`}>
                                    {STATUS[row.status].label}
                                </td>
                                <td className='px-5 py-3 text-right text-ink'>{row.stock}</td>
                                <td className='px-5 py-3 text-right text-ink-soft'>{row.threshold}</td>
                                <td className='px-5 py-3 text-right text-ink-soft'>{row.heldInCheckout || '—'}</td>
                                <td className='px-5 py-3 text-right text-ink-soft'>{row.waitingForRestock || '—'}</td>
                                <td className='px-5 py-3 text-right'>
                                    <Link to={`/admin/product/${row._id}`} className='text-[0.68rem] uppercase tracking-luxe text-brass'>
                                        Restock
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {data && rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className='px-5 py-10 text-center text-ink-faint'>
                                    Nothing needs attention right now.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;

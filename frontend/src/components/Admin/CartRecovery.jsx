import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';

const inr = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = value => `${Math.round((value || 0) * 100)}%`;
const when = value => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');

const Stat = ({ label, value, sub, dark }) => (
    <div className={`border border-line px-6 py-6 ${dark ? 'bg-ink text-canvas' : 'bg-surface'}`}>
        <p className={`eyebrow ${dark ? '!text-brass-soft' : ''}`}>{label}</p>
        <p className={`mt-3 font-display text-4xl ${dark ? '' : 'text-ink'}`}>{value}</p>
        {sub && <p className={`mt-1 font-sans text-xs ${dark ? 'text-canvas/70' : 'text-ink-faint'}`}>{sub}</p>}
    </div>
);

const CartRecovery = () => {
    const [days, setDays] = useState(30);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        axios.get('/api/v1/admin/cart-recovery', { params: { days } })
            .then(({ data }) => setStats(data.stats))
            .catch(error => toast.error(error.response?.data?.message || 'Could not load cart recovery.'));
    }, [days]);

    return (
        <div className='editorial-shell py-12'>
            <MetaData title='Cart Recovery · Admin' />
            <div className='mb-10 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <p className='eyebrow'>Admin</p>
                    <h1 className='heading-display mt-2 text-display'>Cart recovery</h1>
                    <p className='mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft'>
                        Signed-in customers who leave items in their bag get a reminder after 24 hours and a last
                        one after 72. An order within 7 days of a reminder counts as recovered.
                    </p>
                </div>
                <select
                    value={days}
                    onChange={e => setDays(Number(e.target.value))}
                    className='border border-line bg-transparent px-4 py-2 font-sans text-sm text-ink'
                >
                    {[7, 30, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
                </select>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Stat dark label='Recovered revenue' value={inr(stats?.recoveredRevenue)} sub={`${stats?.recovered || 0} orders`} />
                <Stat label='Carts reminded' value={stats?.emailed ?? '—'} sub={`${stats?.abandonedNow || 0} idle right now`} />
                <Stat label='Click rate' value={pct(stats?.clickRate)} sub={`${stats?.clicked || 0} clicked`} />
                <Stat label='Recovery rate' value={pct(stats?.recoveryRate)} />
            </div>

            <div className='mt-10 overflow-x-auto border border-line bg-surface'>
                <table className='w-full min-w-[720px] font-sans text-sm'>
                    <thead>
                        <tr className='border-b border-line text-left text-[0.66rem] uppercase tracking-luxe text-ink-faint'>
                            <th className='px-5 py-3 font-normal'>Customer</th>
                            <th className='px-5 py-3 text-right font-normal'>Bag</th>
                            <th className='px-5 py-3 text-right font-normal'>Reminders</th>
                            <th className='px-5 py-3 font-normal'>Last sent</th>
                            <th className='px-5 py-3 font-normal'>Clicked</th>
                            <th className='px-5 py-3 font-normal'>Outcome</th>
                        </tr>
                    </thead>
                    <tbody className='divide-y divide-line'>
                        {(stats?.recent || []).map(row => (
                            <tr key={row._id}>
                                <td className='px-5 py-3'>
                                    <p className='text-ink'>{row.customer || '—'}</p>
                                    <p className='text-xs text-ink-faint'>{row.email}</p>
                                </td>
                                <td className='px-5 py-3 text-right text-ink'>{inr(row.value)} <span className='text-xs text-ink-faint'>· {row.itemCount}</span></td>
                                <td className='px-5 py-3 text-right text-ink-soft'>{row.emailsSent}</td>
                                <td className='px-5 py-3 text-ink-soft'>{when(row.lastEmailAt)}</td>
                                <td className='px-5 py-3 text-ink-soft'>{when(row.clickedAt)}</td>
                                <td className='px-5 py-3'>
                                    {row.recoveredOrder ? (
                                        <Link to={`/admin/order/${row.recoveredOrder}`} className='text-[0.7rem] uppercase tracking-luxe text-success'>
                                            Recovered →
                                        </Link>
                                    ) : (
                                        <span className='text-[0.7rem] uppercase tracking-luxe text-ink-faint'>Open</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {stats && !stats.recent?.length && (
                            <tr><td colSpan={6} className='px-5 py-10 text-center text-ink-faint'>No reminders sent in this period.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CartRecovery;

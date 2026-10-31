import axios from 'axios';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import { formatINR } from '../../utils/priceLabel';

const DAY = 24 * 60 * 60 * 1000;
const date = value => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** "Ends today", "Ends in 3 days", "Ended 12 Oct 2026". */
const expiryText = coupon => {
    const left = new Date(coupon.expiresAt).getTime() - Date.now();
    if (left <= 0) return `Ended ${date(coupon.expiresAt)}`;
    const days = Math.ceil(left / DAY);
    return days <= 1 ? 'Ends today' : days <= 30 ? `Ends in ${days} days` : `Ends ${date(coupon.expiresAt)}`;
};
const endingSoon = coupon => coupon.active && new Date(coupon.expiresAt).getTime() - Date.now() <= 7 * DAY;

const TABS = [
    { key: 'active', label: 'Active', test: c => c.active },
    { key: 'expired', label: 'Expired', test: c => !c.active },
    { key: 'all', label: 'All', test: () => true },
];

const CopyCode = ({ code }) => {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(`Copied ${code}`);
        } catch {
            toast.error('Could not copy');
        }
    };
    return (
        <button
            type='button'
            onClick={copy}
            title='Copy code'
            className='inline-flex items-center gap-2 border border-dashed border-brass/60 px-2.5 py-1 font-mono text-sm tracking-wider text-ink transition-colors hover:border-brass hover:bg-brass/10'
        >
            {code}
            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true' className='text-ink-faint'>
                <rect x='9' y='9' width='11' height='11' rx='1' /><path d='M5 15V5a1 1 0 0 1 1-1h10' />
            </svg>
        </button>
    );
};

const Status = ({ coupon }) => (
    <span>
        <span className={`block ${coupon.active ? (endingSoon(coupon) ? 'text-brass' : 'text-success') : 'text-ink-faint'}`}>
            {coupon.active ? 'Active' : 'Expired'}
        </span>
        <span className='block text-xs text-ink-faint'>{expiryText(coupon)}</span>
    </span>
);

const Audience = ({ coupon }) => (coupon.membersOnly
    ? <span className='inline-block border border-brass/50 bg-brass/10 px-1.5 py-0.5 font-sans text-[0.6rem] uppercase tracking-luxe text-brass'>Members</span>
    : <span className='text-ink-soft'>Everyone</span>);

/**
 * Admin > Coupons: every coupon with how it's doing. Usage comes from orders
 * placed with the code; the tab lives in the URL (?tab=expired).
 */
const CouponList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = TABS.find(t => t.key === searchParams.get('tab')) || TABS[0];
    const created = searchParams.get('created') || '';

    const [coupons, setCoupons] = useState(null);
    useEffect(() => {
        let alive = true;
        axios.get('/api/v1/admin/coupons')
            .then(({ data }) => alive && setCoupons(Array.isArray(data?.coupons) ? data.coupons : []))
            .catch(error => {
                if (!alive) return;
                setCoupons([]);
                toast.error(error.response?.data?.message || 'Could not load coupons');
            });
        return () => { alive = false; };
    }, []);

    const list = coupons || [];
    const summary = useMemo(() => ({
        active: list.filter(c => c.active).length,
        endingSoon: list.filter(endingSoon).length,
        orders: list.reduce((n, c) => n + c.orders, 0),
        discountGiven: list.reduce((n, c) => n + c.discountGiven, 0),
        revenue: list.reduce((n, c) => n + c.revenue, 0),
    }), [list]);

    const rows = list
        .filter(tab.test)
        .map(c => ({ ...c, id: c._id }))
        // The coupon just created comes first so it's easy to spot.
        .sort((a, b) => (b.code === created) - (a.code === created));

    const columns = [
        {
            key: 'code',
            label: 'Code',
            width: '1.3fr',
            render: row => (
                <span className='flex flex-wrap items-center gap-2'>
                    <CopyCode code={row.code} />
                    {row.code === created && <span className='font-sans text-[0.6rem] uppercase tracking-luxe text-success'>New</span>}
                </span>
            ),
        },
        { key: 'discount', label: 'Discount', width: '0.6fr', render: row => <span className='font-display text-xl text-ink'>{row.discount}%</span> },
        { key: 'membersOnly', label: 'For', width: '0.7fr', render: row => <Audience coupon={row} /> },
        { key: 'status', label: 'Status', width: '1fr', render: row => <Status coupon={row} /> },
        {
            key: 'orders',
            label: 'Used',
            align: 'center',
            width: '0.6fr',
            render: row => (
                <span>
                    <span className='block text-ink'>{row.orders}</span>
                    {row.lastUsedAt && (
                        <span className='block whitespace-nowrap text-xs text-ink-faint'>
                            last {new Date(row.lastUsedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                </span>
            ),
        },
        { key: 'revenue', label: 'Revenue', align: 'right', width: '0.8fr', render: row => (row.orders ? formatINR(row.revenue) : '—') },
        { key: 'discountGiven', label: 'Discount given', align: 'right', width: '0.8fr', render: row => (row.orders ? formatINR(row.discountGiven) : '—') },
        { key: 'createdAt', label: 'Created', align: 'right', width: '0.8fr', render: row => date(row.createdAt) },
    ];

    const renderCard = row => (
        <div className='border-b border-line py-5'>
            <div className='flex items-start justify-between gap-3'>
                <div className='flex flex-col gap-2'>
                    <CopyCode code={row.code} />
                    <span className='flex items-center gap-2 font-sans text-xs'>
                        <Audience coupon={row} />
                        {row.code === created && <span className='uppercase tracking-luxe text-success'>New</span>}
                    </span>
                </div>
                <span className='font-display text-3xl text-ink'>{row.discount}%</span>
            </div>
            <div className='mt-3 flex items-end justify-between gap-3 font-sans text-sm'>
                <Status coupon={row} />
                <span className='text-right text-ink-soft'>
                    {row.orders ? <>{row.orders} {row.orders === 1 ? 'order' : 'orders'} · {formatINR(row.revenue)}</> : 'Not used yet'}
                    {row.orders > 0 && <span className='block text-xs text-ink-faint'>{formatINR(row.discountGiven)} off</span>}
                </span>
            </div>
        </div>
    );

    const tile = (label, value, dark = false) => (
        <div className={`border border-line px-6 py-6 ${dark ? 'bg-ink text-canvas' : 'bg-surface'}`}>
            <p className={`eyebrow ${dark ? '!text-brass-soft' : ''}`}>{label}</p>
            <p className={`mt-3 font-display text-3xl ${dark ? '' : 'text-ink'}`}>{value}</p>
        </div>
    );

    return (
        <Fragment>
            <MetaData title='Coupons · Admin' noIndex />
            <AdminPage title='Coupons' action={<Link to='/admin/coupon' className='btn-solid'>New coupon</Link>}>
                {coupons === null ? (
                    <p className='py-16 text-center font-sans text-sm text-ink-faint'>Loading coupons…</p>
                ) : (
                    <Fragment>
                        <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                            {tile('Active', summary.active, true)}
                            {tile('Ending this week', summary.endingSoon)}
                            {tile('Orders with a coupon', summary.orders)}
                            {tile('Discount given', formatINR(summary.discountGiven))}
                        </div>

                        <div className='mb-6 mt-10 flex flex-wrap items-center gap-2' role='tablist' aria-label='Filter coupons'>
                            {TABS.map(t => {
                                const count = list.filter(t.test).length;
                                const on = t.key === tab.key;
                                return (
                                    <button
                                        key={t.key}
                                        type='button'
                                        role='tab'
                                        aria-selected={on}
                                        onClick={() => {
                                            const next = new URLSearchParams(searchParams);
                                            if (t.key === 'active') next.delete('tab'); else next.set('tab', t.key);
                                            setSearchParams(next, { replace: true });
                                        }}
                                        className={`border px-4 py-2 font-sans text-xs uppercase tracking-luxe transition-colors ${on ? 'border-ink bg-ink text-canvas' : 'border-line text-ink-soft hover:border-ink hover:text-ink'}`}
                                    >
                                        {t.label} <span className={on ? 'text-brass-soft' : 'text-ink-faint'}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {list.length === 0 ? (
                            <div className='border border-line bg-surface px-6 py-16 text-center'>
                                <p className='font-display text-2xl italic text-ink-faint'>No coupons yet.</p>
                                <Link to='/admin/coupon' className='btn-outline mt-6 inline-flex'>Create your first coupon</Link>
                            </div>
                        ) : (
                            <AdminTable
                                columns={columns}
                                rows={rows}
                                renderCard={renderCard}
                                emptyMessage={tab.key === 'active' ? 'No active coupons. Create one, or see expired ones.' : 'No expired coupons.'}
                            />
                        )}
                    </Fragment>
                )}
            </AdminPage>
        </Fragment>
    );
};

export default CouponList;

import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import 'chart.js/auto';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

import { getAdminProduct } from '../../actions/productAction';
import { allRefunds, allReturns, getAllOrders } from '../../actions/orderAction.js';
import { getAllUsers } from '../../actions/userAction.js';
import { getAnalytics, clearErrors } from '../../actions/analyticsAction';
import MetaData from '../layout/MetaData';
import { useTheme } from '../../context/ThemeContext';

const ranges = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '12m', label: '12 Months' },
    { key: 'all', label: 'All Time' },
];

const inr = n =>
    `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const Dashboard = () => {
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [range, setRange] = useState('30d');

    const { products } = useSelector(state => state.products);
    const { orders } = useSelector(state => state.allOrders);
    const { users } = useSelector(state => state.allUsers);
    const { refunds } = useSelector(state => state.allRefunds);
    const { returns } = useSelector(state => state.allReturns);
    const { analytics, loading: analyticsLoading, error: analyticsError } =
        useSelector(state => state.analytics);

    let outOfStock = 0;
    products &&
        products.forEach(item => {
            if (item.Stock === 0) outOfStock += 1;
        });

    useEffect(() => {
        dispatch(getAdminProduct());
        dispatch(getAllOrders());
        dispatch(getAllUsers());
        dispatch(allRefunds());
        dispatch(allReturns());
    }, [dispatch]);

    useEffect(() => {
        dispatch(getAnalytics(range));
    }, [dispatch, range]);

    useEffect(() => {
        if (analyticsError) {
            toast.error(analyticsError);
            dispatch(clearErrors());
        }
    }, [dispatch, analyticsError]);

    // ── palette from design tokens ───────────────────────
    const brass = isDark ? '#C9A063' : '#A07C4B';
    const brassSoft = '#C1A57A';
    const dim = isDark ? '#5C4A33' : '#DCCDB4';
    const inkFaint = isDark ? '#8A8174' : '#8A8278';
    const gridLine = isDark ? 'rgba(84,79,74,0.35)' : 'rgba(224,217,206,0.9)';

    const axisOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: inkFaint, font: { family: 'Jost' } }, grid: { color: gridLine } },
            y: { ticks: { color: inkFaint, font: { family: 'Jost' } }, grid: { color: gridLine } },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: inkFaint,
                    font: { family: 'Jost', size: 11 },
                    usePointStyle: true,
                    boxWidth: 8,
                },
            },
        },
    };

    const horizontalOptions = {
        ...axisOptions,
        indexAxis: 'y',
    };

    const summary = analytics?.summary;
    const series = analytics?.revenueSeries || [];
    const topProducts = analytics?.topProducts || [];
    const categoryRevenue = analytics?.categoryRevenue || [];
    const returnReasons = analytics?.returnReasons || [];
    const statusBreakdown = analytics?.statusBreakdown || [];
    const couponUsage = analytics?.couponUsage || [];

    // ── chart data ───────────────────────────────────────
    const revenueChart = {
        labels: series.map(p => p.period),
        datasets: [
            {
                label: 'Revenue',
                data: series.map(p => p.revenue),
                borderColor: brass,
                backgroundColor: 'rgba(160, 124, 75, 0.15)',
                pointBackgroundColor: brass,
                pointRadius: series.length > 30 ? 0 : 3,
                borderWidth: 2,
                tension: 0.35,
                fill: true,
            },
        ],
    };

    const topProductsChart = {
        labels: topProducts.map(p => p.name),
        datasets: [
            {
                label: 'Revenue',
                data: topProducts.map(p => p.revenue),
                backgroundColor: brass,
                borderWidth: 0,
            },
        ],
    };

    const categoryChart = {
        labels: categoryRevenue.map(c => c.category),
        datasets: [
            {
                data: categoryRevenue.map(c => c.revenue),
                backgroundColor: [brass, dim, brassSoft, '#7E6440', '#E0D2BC', '#4F6E54', '#9C7B52'],
                borderWidth: 0,
            },
        ],
    };

    const returnReasonsChart = {
        labels: returnReasons.map(r => r.reason),
        datasets: [
            {
                label: 'Returns',
                data: returnReasons.map(r => r.count),
                backgroundColor: isDark ? '#C56A5E' : '#9C4237',
                borderWidth: 0,
            },
        ],
    };

    const stockChart = {
        labels: ['Out of Stock', 'In Stock'],
        datasets: [
            {
                backgroundColor: [dim, brass],
                borderWidth: 0,
                data: [outOfStock, (products?.length || 0) - outOfStock],
            },
        ],
    };

    const counts = [
        { label: 'Products', value: products?.length, to: '/admin/products' },
        { label: 'Orders', value: orders?.length, to: '/admin/orders' },
        { label: 'Users', value: users?.length, to: '/admin/users' },
        { label: 'Returns', value: returns?.length, to: '/admin/returns' },
        { label: 'Refunds', value: refunds?.length, to: '/admin/refunds' },
    ];

    const hasData = series.length > 0 || topProducts.length > 0;

    return (
        <Fragment>
            <MetaData title='Dashboard · Admin' />

            <div className='editorial-shell py-12'>
                <div className='mb-10 flex flex-wrap items-end justify-between gap-4'>
                    <div>
                        <p className='eyebrow'>Admin</p>
                        <h1 className='heading-display mt-2 text-display'>Analytics</h1>
                    </div>

                    {/* Range selector */}
                    <div className='flex flex-wrap items-center border border-line'>
                        {ranges.map(r => (
                            <button
                                key={r.key}
                                onClick={() => setRange(r.key)}
                                className={`px-4 py-2.5 font-sans text-[0.68rem] uppercase tracking-luxe transition-colors ${
                                    range === r.key
                                        ? 'bg-ink text-canvas'
                                        : 'text-ink-soft hover:text-brass'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Headline metrics ─────────────────────── */}
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <div className='border border-line bg-ink px-7 py-9'>
                        <p className='eyebrow !text-brass-soft'>Revenue</p>
                        <p className='mt-3 font-display text-4xl font-medium text-canvas'>
                            {inr(summary?.revenue)}
                        </p>
                    </div>
                    <div className='border border-line bg-surface px-7 py-9'>
                        <p className='eyebrow'>Orders</p>
                        <p className='mt-3 font-display text-4xl font-medium text-ink'>
                            {summary?.orders ?? 0}
                        </p>
                    </div>
                    <div className='border border-line bg-surface px-7 py-9'>
                        <p className='eyebrow'>Avg Order Value</p>
                        <p className='mt-3 font-display text-4xl font-medium text-ink'>
                            {inr(summary?.avgOrderValue)}
                        </p>
                    </div>
                    <div className='border border-line bg-surface px-7 py-9'>
                        <p className='eyebrow'>Return Rate</p>
                        <p className='mt-3 font-display text-4xl font-medium text-ink'>
                            {(summary?.returnRate ?? 0).toFixed(1)}%
                        </p>
                        <p className='mt-1 font-sans text-[0.7rem] text-ink-faint'>
                            {summary?.returned ?? 0} of {summary?.orders ?? 0} orders
                        </p>
                    </div>
                </div>

                {/* Secondary metrics */}
                <div className='mt-6 grid gap-6 sm:grid-cols-2'>
                    <div className='border border-line bg-surface px-7 py-6'>
                        <p className='eyebrow'>Units Sold</p>
                        <p className='mt-2 font-display text-3xl font-medium text-ink'>
                            {summary?.units ?? 0}
                        </p>
                    </div>
                    <div className='border border-line bg-surface px-7 py-6'>
                        <p className='eyebrow'>Discount Given</p>
                        <p className='mt-2 font-display text-3xl font-medium text-ink'>
                            {inr(summary?.discountGiven)}
                        </p>
                    </div>
                </div>

                {analyticsLoading && (
                    <p className='mt-8 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint'>
                        Loading analytics…
                    </p>
                )}

                {!analyticsLoading && !hasData && (
                    <p className='mt-16 text-center font-display text-2xl italic text-ink-faint'>
                        No orders in this period.
                    </p>
                )}

                {/* ── Revenue trend ────────────────────────── */}
                {series.length > 0 && (
                    <div className='mt-12'>
                        <p className='eyebrow'>Revenue Over Time</p>
                        <div className='mt-5 h-72 border border-line bg-surface p-6'>
                            <Line data={revenueChart} options={axisOptions} />
                        </div>
                    </div>
                )}

                {/* ── Top products + category split ────────── */}
                <div className='mt-10 grid gap-6 lg:grid-cols-2'>
                    {topProducts.length > 0 && (
                        <div>
                            <p className='eyebrow'>Top Products by Revenue</p>
                            <div className='mt-5 h-80 border border-line bg-surface p-6'>
                                <Bar data={topProductsChart} options={horizontalOptions} />
                            </div>
                        </div>
                    )}

                    {categoryRevenue.length > 0 && (
                        <div>
                            <p className='eyebrow'>Revenue by Category</p>
                            <div className='mt-5 h-80 border border-line bg-surface p-6'>
                                <Doughnut data={categoryChart} options={doughnutOptions} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Return reasons + stock ───────────────── */}
                <div className='mt-10 grid gap-6 lg:grid-cols-2'>
                    {returnReasons.length > 0 && (
                        <div>
                            <p className='eyebrow'>Why Customers Return</p>
                            <div className='mt-5 h-80 border border-line bg-surface p-6'>
                                <Bar data={returnReasonsChart} options={horizontalOptions} />
                            </div>
                        </div>
                    )}

                    <div>
                        <p className='eyebrow'>Stock Split</p>
                        <div className='mt-5 h-80 border border-line bg-surface p-6'>
                            <Doughnut data={stockChart} options={doughnutOptions} />
                        </div>
                    </div>
                </div>

                {/* ── Order status + coupons ───────────────── */}
                <div className='mt-10 grid gap-6 lg:grid-cols-2'>
                    {statusBreakdown.length > 0 && (
                        <div>
                            <p className='eyebrow'>Order Status</p>
                            <div className='mt-5 border border-line bg-surface p-6'>
                                {statusBreakdown.map(s => {
                                    const total = statusBreakdown.reduce((a, x) => a + x.count, 0);
                                    const pct = total ? (s.count / total) * 100 : 0;
                                    return (
                                        <div key={s.status} className='mb-5 last:mb-0'>
                                            <div className='flex items-center justify-between'>
                                                <span className='font-sans text-sm text-ink'>{s.status}</span>
                                                <span className='font-sans text-sm text-ink-soft'>
                                                    {s.count} · {pct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className='mt-2 h-1 w-full bg-line'>
                                                <div
                                                    className='h-1 bg-brass transition-all duration-700 ease-luxe'
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {couponUsage.length > 0 && (
                        <div>
                            <p className='eyebrow'>Coupon Performance</p>
                            <div className='mt-5 border border-line bg-surface p-6'>
                                <div className='grid grid-cols-4 gap-3 border-b border-line pb-3'>
                                    <span className='eyebrow'>Code</span>
                                    <span className='eyebrow text-right'>Orders</span>
                                    <span className='eyebrow text-right'>Revenue</span>
                                    <span className='eyebrow text-right'>Discount</span>
                                </div>
                                {couponUsage.map(c => (
                                    <div key={c.code} className='grid grid-cols-4 gap-3 border-b border-line py-3 last:border-0'>
                                        <span className='font-sans text-sm text-ink'>{c.code}</span>
                                        <span className='text-right font-sans text-sm text-ink-soft'>{c.orders}</span>
                                        <span className='text-right font-sans text-sm text-ink'>{inr(c.revenue)}</span>
                                        <span className='text-right font-sans text-sm text-danger'>−{inr(c.discount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Catalogue counts (all-time) ──────────── */}
                <div className='mt-14'>
                    <p className='eyebrow'>Catalogue · All Time</p>
                    <div className='mt-5 grid grid-cols-2 gap-6 lg:grid-cols-5'>
                        {counts.map(s => (
                            <Link
                                key={s.label}
                                to={s.to}
                                className='group border border-line bg-surface px-6 py-8 text-center transition-all duration-500 ease-luxe hover:border-brass hover:shadow-luxe-sm'
                            >
                                <p className='font-display text-4xl font-medium text-ink transition-colors group-hover:text-brass'>
                                    {s.value ?? 0}
                                </p>
                                <p className='eyebrow mt-2 !text-ink-faint group-hover:!text-brass'>
                                    {s.label}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Dashboard;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { formatINR } from '../../utils/priceLabel';

/*
 * Dashboard: what runs out soon, what each product earns, and how cart
 * reminders are doing (backend services/insights.js).
 */

const percent = value => (value == null ? '—' : `${Math.round(value * 100)}%`);

const Card = ({ title, action, children }) => (
    <section className='border border-line bg-surface p-6'>
        <div className='flex items-baseline justify-between gap-4'>
            <h2 className='eyebrow'>{title}</h2>
            {action}
        </div>
        <div className='mt-5'>{children}</div>
    </section>
);

const CardLink = ({ to, children }) => (
    <Link to={to} className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:text-ink'>{children}</Link>
);

const RunningOut = ({ rows }) => (
    <Card title='Running out soon' action={<CardLink to='/admin/inventory'>Inventory</CardLink>}>
        {rows.length === 0 ? (
            <p className='font-sans text-sm text-ink-soft'>Nothing sells out within three weeks at the current pace.</p>
        ) : (
            <ul className='divide-y divide-line'>
                {rows.map(row => (
                    <li key={`${row.product}|${row.variant || ''}`} className='flex items-center gap-3 py-3'>
                        {row.image ? <img src={row.image} alt='' loading='lazy' className='h-10 w-10 shrink-0 border border-line object-cover' /> : <span className='h-10 w-10 shrink-0 bg-surface-2' />}
                        <Link to={`/admin/product/${row.product}`} className='min-w-0 flex-1 hover:text-brass'>
                            <span className='block truncate font-sans text-sm text-ink'>{row.name}</span>
                            <span className='block truncate font-sans text-xs text-ink-faint'>
                                {row.label ? `${row.label} · ` : ''}{row.stock} left · {row.soldLast30Days} sold in 30 days
                            </span>
                        </Link>
                        <span className={`shrink-0 font-sans text-sm ${row.daysLeft <= 7 ? 'text-danger' : 'text-brass'}`}>
                            {row.stock === 0 ? 'Sold out' : row.daysLeft === 0 ? 'Under a day' : `${row.daysLeft} ${row.daysLeft === 1 ? 'day' : 'days'}`}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </Card>
);

const Profitability = ({ data }) => {
    const { totals, products, missingCost, days } = data;
    return (
        <Card title={`Profitability · last ${days} days`} action={<CardLink to='/admin/products'>Products</CardLink>}>
            <div className='grid grid-cols-3 gap-4'>
                <div>
                    <p className='font-sans text-xs text-ink-faint'>Revenue</p>
                    <p className='mt-1 font-display text-2xl text-ink'>{formatINR(totals.revenue)}</p>
                </div>
                <div>
                    <p className='font-sans text-xs text-ink-faint'>Gross margin</p>
                    <p className='mt-1 font-display text-2xl text-ink'>{totals.revenueWithCost ? formatINR(totals.margin) : '—'}</p>
                </div>
                <div>
                    <p className='font-sans text-xs text-ink-faint'>Margin rate</p>
                    <p className='mt-1 font-display text-2xl text-ink'>{percent(totals.marginRate)}</p>
                </div>
            </div>
            {missingCost.length > 0 && (
                <p className='mt-4 border-l-2 border-brass pl-3 font-sans text-xs leading-relaxed text-ink-soft'>
                    {missingCost.length} {missingCost.length === 1 ? 'product has' : 'products have'} sales but no cost price, so
                    {missingCost.length === 1 ? ' it is' : ' they are'} left out of the margin.{' '}
                    {missingCost.slice(0, 3).map((p, i) => (
                        <span key={p.product}>{i > 0 && ', '}<Link to={`/admin/product/${p.product}`} className='text-brass hover:underline'>{p.name}</Link></span>
                    ))}
                    {missingCost.length > 3 && ` and ${missingCost.length - 3} more`}.
                </p>
            )}
            {products.length > 0 && (
                <div className='mt-5 overflow-x-auto'>
                    <table className='w-full min-w-[480px] font-sans text-sm'>
                        <thead>
                            <tr className='text-left text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                                <th className='py-2 font-normal'>Product</th>
                                <th className='py-2 text-right font-normal'>Sold</th>
                                <th className='py-2 text-right font-normal'>Revenue</th>
                                <th className='py-2 text-right font-normal'>Margin</th>
                                <th className='py-2 text-right font-normal'>Returned</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-line'>
                            {products.map(row => (
                                <tr key={row.product}>
                                    <td className='max-w-[14rem] truncate py-2 text-ink'>{row.name}</td>
                                    <td className='py-2 text-right text-ink-soft'>{row.units}</td>
                                    <td className='py-2 text-right text-ink'>{formatINR(row.revenue)}</td>
                                    <td className='py-2 text-right'>
                                        {row.margin == null ? <span className='text-ink-faint'>No cost</span> : (
                                            <span className={row.margin < 0 ? 'text-danger' : 'text-ink'}>{formatINR(row.margin)} <span className='text-xs text-ink-faint'>{percent(row.marginRate)}</span></span>
                                        )}
                                    </td>
                                    <td className={`py-2 text-right ${row.refundRate >= 0.2 ? 'text-danger' : 'text-ink-soft'}`}>{percent(row.refundRate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className='mt-4 font-sans text-xs text-ink-faint'>
                After coupons and refunds, before payment fees. Uses today’s cost prices.
            </p>
        </Card>
    );
};

const Recovery = ({ data }) => (
    <Card title='Cart reminders · last 30 days' action={<CardLink to='/admin/cart-recovery'>Details</CardLink>}>
        {!data || data.emailed === 0 ? (
            <p className='font-sans text-sm text-ink-soft'>No reminder emails in the last 30 days.</p>
        ) : (
            <div className='grid grid-cols-2 gap-4'>
                <div>
                    <p className='font-sans text-xs text-ink-faint'>Recovered revenue</p>
                    <p className='mt-1 font-display text-2xl text-ink'>{formatINR(data.recoveredRevenue)}</p>
                </div>
                <div>
                    <p className='font-sans text-xs text-ink-faint'>Carts won back</p>
                    <p className='mt-1 font-display text-2xl text-ink'>{data.recovered} <span className='font-sans text-sm text-ink-faint'>of {data.emailed}</span></p>
                </div>
                <p className='col-span-2 font-sans text-xs text-ink-faint'>
                    {percent(data.recoveryRate)} of reminded shoppers came back and bought · {data.clicked} opened the link
                </p>
            </div>
        )}
    </Card>
);

const InsightsPanel = () => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        axios.get('/api/v1/admin/insights')
            .then(({ data: body }) => active && setData(body))
            .catch(() => active && setFailed(true));
        return () => {
            active = false;
        };
    }, []);

    if (failed) return null;
    if (!data) {
        return <div className='mt-10 grid gap-6 lg:grid-cols-2'><div className='h-48 animate-pulse bg-surface-2' /><div className='h-48 animate-pulse bg-surface-2' /></div>;
    }

    return (
        <div className='mt-10 grid gap-6 lg:grid-cols-2'>
            <div className='lg:col-span-2'><Profitability data={data.profitability} /></div>
            <RunningOut rows={data.runningOut} />
            <Recovery data={data.recovery} />
        </div>
    );
};

export default InsightsPanel;

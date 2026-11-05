import React, { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';

/*
 * Core Web Vitals from real visitors (utils/webVitals.js): the 75th
 * percentile over the last 28 days, the way Google judges a site. A number
 * only shows once there are enough measurements to mean something.
 */

const METRICS = {
    LCP: { name: 'Largest paint', hint: 'How soon the main content shows', unit: 'ms' },
    INP: { name: 'Responsiveness', hint: 'How fast taps and clicks respond', unit: 'ms' },
    CLS: { name: 'Layout shift', hint: 'How much the page jumps while loading', unit: '' },
    FCP: { name: 'First paint', hint: 'How soon anything shows', unit: 'ms' },
    TTFB: { name: 'Server response', hint: 'How soon the first byte arrives', unit: 'ms' },
};
const CORE = ['LCP', 'INP', 'CLS'];
const PAGE_LABEL = { home: 'Home', listing: 'Listings & search', product: 'Product pages', cart: 'Cart', checkout: 'Checkout', account: 'Account & orders', other: 'Other pages' };
const RATING = {
    good: { label: 'Good', className: 'border-success/40 bg-success/10 text-success' },
    'needs-improvement': { label: 'Needs work', className: 'border-brass/50 bg-brass/10 text-brass' },
    poor: { label: 'Poor', className: 'border-danger/40 bg-danger/10 text-danger' },
};

const format = (metric, value) => {
    if (value == null) return '—';
    if (metric === 'CLS') return value.toFixed(2);
    return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
};

const Rating = ({ rating }) => (rating ? (
    <span className={`inline-block border px-2 py-0.5 font-sans text-[0.62rem] uppercase tracking-luxe ${RATING[rating].className}`}>
        {RATING[rating].label}
    </span>
) : null);

/** Where the 75th percentile falls on the good / needs work / poor scale. */
const Scale = ({ metric, value, thresholds }) => {
    const [good, poor] = thresholds;
    const max = poor * 1.5;
    const at = value == null ? null : Math.min(100, (value / max) * 100);
    return (
        <div className='mt-4' aria-hidden='true'>
            <div className='relative flex h-1.5 overflow-hidden'>
                <span className='bg-success' style={{ width: `${(good / max) * 100}%` }} />
                <span className='bg-brass' style={{ width: `${((poor - good) / max) * 100}%` }} />
                <span className='flex-1 bg-danger' />
                {at != null && <span className='absolute top-[-3px] h-3 w-0.5 bg-ink' style={{ left: `${at}%` }} />}
            </div>
            <p className='mt-2 font-sans text-xs text-ink-faint'>
                Good ≤ {format(metric, good)} · Poor &gt; {format(metric, poor)}
            </p>
        </div>
    );
};

const MetricCard = ({ item, minSamples }) => {
    const info = METRICS[item.metric];
    return (
        <div className='border border-line bg-surface p-6'>
            <div className='flex items-start justify-between gap-3'>
                <div>
                    <p className='eyebrow'>{item.metric} · {info.name}</p>
                    <p className='mt-1 font-sans text-xs text-ink-faint'>{info.hint}</p>
                </div>
                <Rating rating={item.rating} />
            </div>
            <p className='mt-4 font-display text-4xl text-ink'>{format(item.metric, item.p75)}</p>
            {item.p75 == null && (
                <p className='mt-1 font-sans text-xs text-ink-soft'>
                    {item.samples} of {minSamples} visits needed for a reliable number
                </p>
            )}
            <Scale metric={item.metric} value={item.p75} thresholds={item.thresholds} />
            <p className='mt-1 font-sans text-xs text-ink-faint'>{item.samples} {item.samples === 1 ? 'visit' : 'visits'}</p>
        </div>
    );
};

const SitePerformance = () => {
    const [device, setDevice] = useState('mobile');
    const [data, setData] = useState(null);

    useEffect(() => {
        let active = true;
        setData(null);
        axios.get('/api/v1/admin/vitals', { params: { device, days: 28 } })
            .then(({ data: body }) => active && setData(body))
            .catch(error => toast.error(error.response?.data?.message || 'Could not load site performance.'));
        return () => {
            active = false;
        };
    }, [device]);

    const overall = data?.overall || [];
    const core = overall.filter(m => CORE.includes(m.metric));
    const extra = overall.filter(m => !CORE.includes(m.metric));
    const noData = data && overall.every(m => m.samples === 0);

    const deviceToggle = (
        <div role='group' aria-label='Device' className='flex border border-line'>
            {['mobile', 'desktop'].map(d => (
                <button
                    key={d}
                    type='button'
                    aria-pressed={device === d}
                    onClick={() => setDevice(d)}
                    className={`min-h-[44px] px-5 font-sans text-[0.68rem] uppercase tracking-luxe ${device === d ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink'}`}
                >
                    {d === 'mobile' ? 'Phones' : 'Desktop'}
                </button>
            ))}
        </div>
    );

    return (
        <Fragment>
            <MetaData title='Site performance · Admin' noIndex />
            <AdminPage title='Site performance' action={deviceToggle}>
                <p className='-mt-6 mb-10 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft'>
                    Measured in real visitors’ browsers over the last {data?.days || 28} days. Each number is the
                    75th percentile: three in four visits were at least this fast, which is how Google rates a site.
                </p>

                {!data ? (
                    <p className='py-16 text-center font-sans text-sm text-ink-faint'>Loading…</p>
                ) : noData ? (
                    <div className='border border-line bg-surface p-10 text-center'>
                        <p className='font-display text-2xl text-ink'>No measurements yet</p>
                        <p className='mx-auto mt-3 max-w-md font-sans text-sm text-ink-soft'>
                            Numbers appear as visitors browse the live site on {device === 'mobile' ? 'phones' : 'desktop'}.
                            Each page view sends one anonymous measurement when the visitor leaves it.
                        </p>
                    </div>
                ) : (
                    <Fragment>
                        <section aria-label='Core Web Vitals' className='grid gap-4 lg:grid-cols-3'>
                            {core.map(item => <MetricCard key={item.metric} item={item} minSamples={data.minSamples} />)}
                        </section>
                        <section aria-label='Loading' className='mt-4 grid gap-4 sm:grid-cols-2'>
                            {extra.map(item => <MetricCard key={item.metric} item={item} minSamples={data.minSamples} />)}
                        </section>

                        <section aria-labelledby='by-page' className='mt-12'>
                            <h2 id='by-page' className='font-display text-2xl text-ink'>By kind of page</h2>
                            <div className='mt-5 overflow-x-auto border border-line bg-surface'>
                                <table className='w-full min-w-[640px] font-sans text-sm'>
                                    <thead>
                                        <tr className='border-b border-line text-left text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                                            <th className='px-5 py-3 font-normal'>Page</th>
                                            {CORE.map(m => <th key={m} className='px-5 py-3 font-normal'>{m}</th>)}
                                            <th className='px-5 py-3 text-right font-normal'>Visits</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-line'>
                                        {data.byPage.map(row => {
                                            const of = metric => row.metrics.find(m => m.metric === metric);
                                            return (
                                                <tr key={row.page}>
                                                    <td className='px-5 py-3 text-ink'>{PAGE_LABEL[row.page] || row.page}</td>
                                                    {CORE.map(metric => {
                                                        const item = of(metric);
                                                        return (
                                                            <td key={metric} className='px-5 py-3'>
                                                                <span className='mr-2 text-ink'>{format(metric, item.p75)}</span>
                                                                <Rating rating={item.rating} />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className='px-5 py-3 text-right text-ink-soft'>{of('LCP').samples || of('FCP').samples}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className='mt-3 font-sans text-xs text-ink-faint'>
                                “—” means fewer than {data.minSamples} visits to that kind of page so far.
                            </p>
                        </section>
                    </Fragment>
                )}
            </AdminPage>
        </Fragment>
    );
};

export default SitePerformance;

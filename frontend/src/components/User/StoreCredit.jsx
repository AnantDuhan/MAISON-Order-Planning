import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';

const inr = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const LABEL = {
    refund: 'Refund',
    checkout: 'Used at checkout',
    'checkout-reversal': 'Returned from an unfinished checkout',
    adjustment: 'Adjustment by MAISON',
};

const StoreCredit = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('/api/v1/wallet/me')
            .then(({ data: body }) => setData(body))
            .catch(error => toast.error(error.response?.data?.message || 'Could not load your store credit.'));
    }, []);

    return (
        <div className='editorial-shell max-w-3xl py-14'>
            <MetaData title='Store credit · Maison' />
            <p className='eyebrow'>Account</p>
            <h1 className='heading-display mt-3 text-display'>Store credit</h1>

            <div className='mt-10 border border-line bg-ink px-8 py-10 text-canvas'>
                <p className='eyebrow !text-brass-soft'>Available</p>
                <p className='mt-3 font-display text-5xl'>{data ? inr(data.balance) : '—'}</p>
                <p className='mt-3 font-sans text-sm text-canvas/70'>
                    Applied automatically when you choose “Use store credit” at checkout. It doesn’t expire.
                </p>
                {data?.balance > 0 && (
                    <Link to='/products' className='mt-6 inline-block font-sans text-[0.7rem] uppercase tracking-luxe text-brass-soft'>
                        Shop now →
                    </Link>
                )}
            </div>

            <p className='eyebrow mt-12'>History</p>
            <ul className='mt-4 divide-y divide-line border-y border-line'>
                {(data?.entries || []).map(entry => (
                    <li key={entry._id} className='flex flex-wrap items-baseline justify-between gap-3 py-4'>
                        <div>
                            <p className='font-sans text-sm text-ink'>{LABEL[entry.type] || entry.type}</p>
                            <p className='font-sans text-xs text-ink-faint'>
                                {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {entry.note ? ` · ${entry.note}` : ''}
                            </p>
                        </div>
                        <div className='text-right'>
                            <p className={`font-display text-lg ${entry.amount > 0 ? 'text-success' : 'text-ink'}`}>
                                {entry.amount > 0 ? '+' : '−'}{inr(Math.abs(entry.amount))}
                            </p>
                            <p className='font-sans text-xs text-ink-faint'>Balance {inr(entry.balanceAfter)}</p>
                        </div>
                    </li>
                ))}
                {data && data.entries.length === 0 && (
                    <li className='py-10 text-center font-sans text-sm text-ink-faint'>
                        No store credit yet. Refunds you choose to take as credit will appear here.
                    </li>
                )}
            </ul>
        </div>
    );
};

export default StoreCredit;

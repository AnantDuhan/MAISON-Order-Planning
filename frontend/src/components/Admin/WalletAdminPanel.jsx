import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const inr = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const inputClass = 'w-full border border-line bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-brass';

/** Admin: a customer's store credit balance, ledger and manual adjustments. */
const WalletAdminPanel = ({ userId }) => {
    const [data, setData] = useState(null);
    const [form, setForm] = useState({ amount: '', note: '' });
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        axios.get(`/api/v1/admin/wallet/${userId}`).then(({ data: body }) => setData(body)).catch(() => {});
    }, [userId]);
    useEffect(() => {
        if (userId) load();
    }, [userId, load]);

    const submit = async () => {
        setBusy(true);
        try {
            const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            await axios.post(`/api/v1/admin/wallet/${userId}/adjust`, { amount: Number(form.amount), note: form.note, requestId });
            toast.success('Store credit updated');
            setForm({ amount: '', note: '' });
            load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not adjust store credit');
        } finally {
            setBusy(false);
        }
    };

    if (!data) return null;
    return (
        <div className='mt-10 border border-line bg-surface p-6'>
            <div className='flex items-baseline justify-between'>
                <p className='eyebrow'>Store credit</p>
                <p className='font-display text-2xl text-ink'>{inr(data.balance)}</p>
            </div>

            <div className='mt-5 grid gap-3 sm:grid-cols-[140px_1fr_auto]'>
                <input
                    className={inputClass}
                    type='number'
                    step='0.01'
                    placeholder='± Amount'
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                />
                <input
                    className={inputClass}
                    placeholder='Reason (shown to the customer)'
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                />
                <button onClick={submit} disabled={busy || !form.amount || form.note.trim().length < 3} className='btn-solid disabled:opacity-40'>
                    Apply
                </button>
            </div>
            <p className='mt-2 font-sans text-xs text-ink-faint'>Positive adds credit, negative removes it. Every change is in the audit log.</p>

            {data.entries.length > 0 && (
                <ul className='mt-5 divide-y divide-line'>
                    {data.entries.slice(0, 10).map(entry => (
                        <li key={entry._id} className='flex justify-between gap-3 py-2 font-sans text-xs'>
                            <span className='text-ink-soft'>
                                {new Date(entry.createdAt).toLocaleDateString('en-IN')} · {entry.type}{entry.note ? ` · ${entry.note}` : ''}
                            </span>
                            <span className={entry.amount > 0 ? 'text-success' : 'text-ink'}>
                                {entry.amount > 0 ? '+' : ''}{inr(entry.amount)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default WalletAdminPanel;

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';

const ENTITY_LINK = {
    order: id => `/admin/order/${id}`,
    product: id => `/admin/product/${id}`,
    user: id => `/admin/user/${id}`,
};

const formatWhen = value => new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

const show = value => {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

/** One entry: who, what, when; expands to field changes and the request. */
export const AuditEntry = ({ entry }) => {
    const [open, setOpen] = useState(false);
    const link = entry.entity?.id && ENTITY_LINK[entry.entity.type]?.(entry.entity.id);

    return (
        <li className='py-4'>
            <button onClick={() => setOpen(o => !o)} className='flex w-full flex-wrap items-baseline justify-between gap-2 text-left'>
                <span className='font-sans text-sm text-ink'>
                    {entry.summary || entry.action}
                </span>
                <span className='font-sans text-xs text-ink-faint'>{formatWhen(entry.at)}</span>
            </button>
            <p className='mt-1 font-sans text-xs text-ink-soft'>
                <span className='font-mono'>{entry.action}</span>
                {' · '}{entry.actor?.name || 'Unknown'}{entry.actor?.email ? ` (${entry.actor.email})` : ''}
                {link && <> · <Link to={link} className='text-brass'>{entry.entity.type} {entry.entity.id}</Link></>}
            </p>
            {open && (
                <div className='mt-3 space-y-3 border-l border-line pl-4'>
                    {entry.changes?.length > 0 && (
                        <table className='font-sans text-xs'>
                            <tbody>
                                {entry.changes.map(change => (
                                    <tr key={change.field}>
                                        <td className='pr-4 text-ink-faint'>{change.field}</td>
                                        <td className='pr-2 text-danger line-through'>{show(change.from)}</td>
                                        <td className='text-success'>{show(change.to)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {entry.request && Object.keys(entry.request).length > 0 && (
                        <pre className='max-h-48 overflow-auto bg-surface-2 p-3 font-mono text-[0.7rem] text-ink-soft'>
                            {JSON.stringify(entry.request, null, 2)}
                        </pre>
                    )}
                    <p className='font-sans text-[0.7rem] text-ink-faint'>{entry.method} {entry.path} · {entry.ip}</p>
                </div>
            )}
        </li>
    );
};

/** Compact history for one record, e.g. on the process-order page. */
export const EntityHistory = ({ entityType, entityId }) => {
    const [entries, setEntries] = useState(null);
    useEffect(() => {
        if (!entityId) return;
        axios.get('/api/v1/admin/audit-log', { params: { entityType, entityId, limit: 20 } })
            .then(({ data }) => setEntries(data.entries))
            .catch(() => setEntries([]));
    }, [entityType, entityId]);

    if (!entries?.length) return null;
    return (
        <div className='border border-line bg-surface p-6'>
            <p className='eyebrow'>History</p>
            <ul className='mt-2 divide-y divide-line'>
                {entries.map(entry => <AuditEntry key={entry._id} entry={entry} />)}
            </ul>
        </div>
    );
};

const inputClass = 'border border-line bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-brass';

const AuditLog = () => {
    const [filters, setFilters] = useState({ entityType: '', action: '', actor: '', q: '', from: '', to: '' });
    const [actions, setActions] = useState([]);
    const [entries, setEntries] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (append = false, before = null) => {
        setLoading(true);
        try {
            const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
            if (before) params.before = before;
            const { data } = await axios.get('/api/v1/admin/audit-log', { params });
            setEntries(prev => (append ? [...prev, ...data.entries] : data.entries));
            setCursor(data.nextCursor);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not load the audit log.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        axios.get('/api/v1/admin/audit-log/actions').then(({ data }) => setActions(data.actions)).catch(() => {});
    }, []);
    useEffect(() => {
        load(false);
    }, [load]);

    const set = key => e => setFilters(f => ({ ...f, [key]: e.target.value }));

    return (
        <div className='editorial-shell py-12'>
            <MetaData title='Audit Log · Admin' />
            <div className='mb-8'>
                <p className='eyebrow'>Admin</p>
                <h1 className='heading-display mt-2 text-display'>Audit log</h1>
                <p className='mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft'>
                    Every change made from the admin panel: who made it, when, and what changed. Entries can’t be
                    edited or deleted.
                </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
                <select className={inputClass} value={filters.entityType} onChange={set('entityType')}>
                    <option value=''>All records</option>
                    {['order', 'product', 'user', 'return', 'banner', 'coupon', 'wallet'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className={inputClass} value={filters.action} onChange={set('action')}>
                    <option value=''>All actions</option>
                    {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <input className={inputClass} placeholder='Admin email' value={filters.actor} onChange={set('actor')} />
                <input className={inputClass} placeholder='Search summary' value={filters.q} onChange={set('q')} />
                <input className={inputClass} type='date' value={filters.from} onChange={set('from')} aria-label='From' />
                <input className={inputClass} type='date' value={filters.to} onChange={set('to')} aria-label='To' />
            </div>

            <ul className='mt-8 divide-y divide-line border-y border-line'>
                {entries.map(entry => <AuditEntry key={entry._id} entry={entry} />)}
                {!loading && entries.length === 0 && (
                    <li className='py-10 text-center font-sans text-sm text-ink-faint'>No matching entries.</li>
                )}
            </ul>

            {cursor && (
                <button onClick={() => load(true, cursor)} disabled={loading} className='btn-outline mt-6 disabled:opacity-40'>
                    {loading ? 'Loading…' : 'Load older'}
                </button>
            )}
        </div>
    );
};

export default AuditLog;

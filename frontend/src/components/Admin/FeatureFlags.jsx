import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';
import Loader from '../layout/Loader/Loader';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

/** Accessible on/off switch. */
const Switch = ({ checked, onChange, disabled, label }) => (
    <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'border-brass bg-brass' : 'border-ink-faint/70 bg-transparent'}`}
    >
        <span
            className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[1.4rem] bg-surface' : 'translate-x-1 bg-ink-faint'}`}
        />
    </button>
);

const when = value => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const FeatureFlags = () => {
    const { refresh: refreshStorefront } = useFeatureFlags();
    const [features, setFeatures] = useState(null);
    const [saving, setSaving] = useState(null);
    const [confirm, setConfirm] = useState(null); // critical feature waiting for confirmation

    useEffect(() => {
        axios.get('/api/v1/admin/features')
            .then(({ data }) => setFeatures(data.features))
            .catch(error => toast.error(error.response?.data?.message || 'Could not load features'));
    }, []);

    const groups = useMemo(() => {
        const map = new Map();
        for (const f of features || []) {
            if (!map.has(f.group)) map.set(f.group, []);
            map.get(f.group).push(f);
        }
        return [...map];
    }, [features]);

    const offCount = (features || []).filter(f => !f.enabled).length;

    const apply = async (feature, enabled) => {
        setSaving(feature.key);
        // Optimistic: flip now, put it back if the server says no.
        setFeatures(list => list.map(f => (f.key === feature.key ? { ...f, enabled } : f)));
        try {
            const { data } = await axios.patch(`/api/v1/admin/features/${feature.key}`, { enabled });
            setFeatures(list => list.map(f => (f.key === feature.key ? data.feature : f)));
            toast.success(`${feature.label} ${enabled ? 'turned on' : 'turned off'}`);
            refreshStorefront();
        } catch (error) {
            setFeatures(list => list.map(f => (f.key === feature.key ? { ...f, enabled: !enabled } : f)));
            toast.error(error.response?.data?.message || `Could not update ${feature.label}`);
        } finally {
            setSaving(null);
        }
    };

    const toggle = (feature, enabled) => {
        if (feature.critical && !enabled) setConfirm(feature);
        else apply(feature, enabled);
    };

    if (!features) return <Loader label='Loading features' />;

    return (
        <div className='editorial-shell max-w-4xl py-12'>
            <MetaData title='Features · Admin' />
            <p className='eyebrow'>Admin</p>
            <h1 className='heading-display mt-2 text-display'>Features</h1>
            <p className='mt-3 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft'>
                Turn parts of the shop on or off. Changes apply to every visitor within a few seconds, are
                enforced by the server, and are recorded in the audit log.
            </p>
            {offCount > 0 && (
                <p className='mt-4 font-sans text-sm text-brass'>
                    {offCount} {offCount === 1 ? 'feature is' : 'features are'} switched off.
                </p>
            )}

            <div className='mt-10 space-y-10'>
                {groups.map(([group, list]) => (
                    <section key={group} aria-labelledby={`group-${group}`}>
                        <h2 id={`group-${group}`} className='font-display text-2xl text-ink'>{group}</h2>
                        <ul className='mt-4 divide-y divide-line border border-line bg-surface'>
                            {list.map(feature => (
                                <li key={feature.key} className='flex items-start justify-between gap-6 p-5 sm:p-6'>
                                    <div className='min-w-0'>
                                        <p className='flex flex-wrap items-center gap-2 font-sans text-base text-ink'>
                                            {feature.label}
                                            {!feature.enabled && (
                                                <span className='border border-brass/40 px-2 py-0.5 font-sans text-xs text-brass'>Off</span>
                                            )}
                                        </p>
                                        <p className='mt-1 max-w-xl font-sans text-sm leading-relaxed text-ink-soft'>{feature.description}</p>
                                        {feature.updatedBy && (
                                            <p className='mt-2 font-sans text-xs text-ink-faint'>
                                                Last changed by {feature.updatedBy} · {when(feature.updatedAt)}
                                            </p>
                                        )}
                                    </div>
                                    <Switch
                                        checked={feature.enabled}
                                        disabled={saving === feature.key}
                                        onChange={enabled => toggle(feature, enabled)}
                                        label={`${feature.label}: ${feature.enabled ? 'on' : 'off'}`}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            {confirm && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4' role='dialog' aria-modal='true' aria-labelledby='confirm-title'>
                    <div className='w-full max-w-md border border-line bg-surface p-8'>
                        <h2 id='confirm-title' className='font-display text-2xl text-ink'>Turn off {confirm.label.toLowerCase()}?</h2>
                        <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>{confirm.description}</p>
                        <div className='mt-8 flex justify-end gap-3'>
                            <button type='button' onClick={() => setConfirm(null)} className='btn-outline'>Keep it on</button>
                            <button
                                type='button'
                                onClick={() => { const f = confirm; setConfirm(null); apply(f, false); }}
                                className='btn-solid'
                            >
                                Turn off
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeatureFlags;

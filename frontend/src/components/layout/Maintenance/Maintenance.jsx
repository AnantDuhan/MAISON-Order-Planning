import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import MetaData from '../MetaData';
import { LEGAL_EMAIL } from '../Legal/LegalPage';
import { useFeatureFlags } from '../../../context/FeatureFlagsContext';
import './Maintenance.css';

const formatTime = date =>
    date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Shown to customers while the storefront is switched off (admin Features
 * page) or MAINTENANCE_MODE=true on the server. FeatureFlagsProvider re-checks
 * every minute while the shop is closed, so this page disappears on its own
 * when the shop reopens.
 */
const Maintenance = () => {
    const { refresh } = useFeatureFlags();
    const [checking, setChecking] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    const checkNow = useCallback(async () => {
        setChecking(true);
        const features = await refresh();
        setChecking(false);
        // If the shop reopened, the provider swaps this page out; nothing to say.
        if (features?.storefront !== false) return;
        setLastResult(features ? `Still closed. Checked at ${formatTime(new Date())}.` : 'Couldn’t reach Maison. Try again in a moment.');
    }, [refresh]);

    return (
        <div className='flex min-h-screen flex-col bg-canvas text-ink'>
            <MetaData title='Closed for maintenance · Maison' noIndex />

            {/* Same wordmark as the storefront header. */}
            <header className='flex justify-center px-6 pt-8'>
                <div className='flex flex-col items-center leading-none'>
                    <span className='font-display text-2xl font-medium tracking-wide text-ink sm:text-[1.75rem]'>
                        MAISON
                    </span>
                    <span className='mt-0.5 font-sans text-[0.55rem] uppercase tracking-wide2 text-brass'>
                        Order Planning
                    </span>
                </div>
            </header>

            <main className='flex flex-1 flex-col items-center px-6 pb-16 pt-6 text-center sm:pt-10'>
                <div className='door-sign' aria-hidden='true'>
                    <svg className='door-sign__cord' viewBox='0 0 240 72' preserveAspectRatio='none'>
                        <path d='M40 72 L120 7 L200 72' fill='none' stroke='rgb(var(--c-brass))' strokeWidth='1.25' />
                        <circle cx='120' cy='6' r='4.5' fill='rgb(var(--c-brass))' />
                    </svg>
                    <div className='door-sign__card'>
                        <span className='door-sign__eyelet door-sign__eyelet--left' />
                        <span className='door-sign__eyelet door-sign__eyelet--right' />
                        <p className='font-display text-[3.25rem] font-medium leading-none text-ink'>Closed</p>
                        <div className='door-sign__rule' />
                        <p className='font-display text-xl italic text-ink-soft'>back shortly</p>
                    </div>
                </div>

                <h1 className='heading-display mt-14 max-w-3xl text-display' style={{ textWrap: 'balance' }}>We’re rearranging the rooms</h1>

                <p className='mt-6 max-w-md font-sans text-base leading-relaxed text-ink-soft'>
                    Maison is closed for scheduled maintenance. Your bag, wishlist and past orders are
                    kept exactly as you left them.
                </p>

                <div className='mt-10 flex flex-col items-center gap-3'>
                    <p className='max-w-xs font-sans text-sm leading-relaxed text-ink-faint sm:max-w-none'>
                        <span className={`status-dot${checking ? ' status-dot--checking' : ''}`} aria-hidden='true' />
                        This page checks every minute and reopens the shop for you.
                    </p>
                    <button
                        type='button'
                        onClick={checkNow}
                        disabled={checking}
                        className='btn-outline disabled:cursor-wait disabled:opacity-60'
                    >
                        {checking ? 'Checking…' : 'Check again'}
                    </button>
                    <p className='min-h-[1.25rem] font-sans text-xs text-ink-faint' role='status' aria-live='polite'>
                        {lastResult}
                    </p>
                </div>
            </main>

            <footer className='flex flex-col items-center justify-between gap-3 border-t border-line px-6 py-6 font-sans text-sm text-ink-faint sm:flex-row sm:px-10'>
                <p>
                    Questions about an order?{' '}
                    <a href={`mailto:${LEGAL_EMAIL}`} className='text-ink underline underline-offset-4 hover:text-brass'>
                        {LEGAL_EMAIL}
                    </a>
                </p>
                <Link to='/login' className='underline underline-offset-4 hover:text-brass'>
                    Team sign-in
                </Link>
            </footer>
        </div>
    );
};

export default Maintenance;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getConsent, initAnalytics, setConsent } from '../../utils/analytics';

/**
 * Essential cookies (login session, cart) always work. Analytics cookies only
 * load after "Accept". The choice is stored locally and can be changed from
 * the "Cookie settings" link in the footer (dispatches `open-cookie-settings`).
 */
const CookieConsent = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (getConsent()) initAnalytics();
        else setOpen(true);

        const reopen = () => setOpen(true);
        window.addEventListener('open-cookie-settings', reopen);
        return () => window.removeEventListener('open-cookie-settings', reopen);
    }, []);

    const choose = value => {
        setConsent(value);
        setOpen(false);
        // GA can't be unloaded mid-session; reload so a withdrawal takes effect.
        if (value === 'rejected' && window.gtag) window.location.reload();
    };

    if (!open) return null;

    // A slim bar on phones (it used to cover a third of the screen), a small
    // card from 640px. Hidden while a menu or sheet is open.
    return (
        <div
            role='dialog'
            aria-live='polite'
            aria-label='Cookie preferences'
            className='hide-under-overlay fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md sm:border sm:px-6 sm:py-5'
        >
            <p className='hidden eyebrow sm:block'>Cookies</p>
            <div className='flex items-center gap-3 sm:block'>
                <p className='min-w-0 flex-1 font-sans text-xs leading-snug text-ink-soft sm:mt-3 sm:text-sm sm:leading-relaxed'>
                    <span className='sm:hidden'>Essential cookies keep you signed in; analytics only if you allow. </span>
                    <span className='hidden sm:inline'>
                        We use essential cookies to keep you signed in and remember your cart. With your
                        permission, we'd also like to use analytics cookies to understand how the store is
                        used. Read our{' '}
                    </span>
                    <Link to='/privacy' className='underline underline-offset-2 text-ink'>
                        <span className='sm:hidden'>Privacy</span>
                        <span className='hidden sm:inline'>Privacy Policy</span>
                    </Link>
                    <span className='hidden sm:inline'>.</span>
                </p>
                <div className='flex shrink-0 gap-2 sm:mt-5 sm:gap-3'>
                    <button type='button' className='btn-outline !px-3 !py-2 !text-[0.62rem] sm:!px-8 sm:!py-4 sm:!text-[0.78rem]' onClick={() => choose('rejected')}>
                        <span className='sm:hidden'>Essential</span>
                        <span className='hidden sm:inline'>Essential only</span>
                    </button>
                    <button type='button' className='btn-solid !px-3 !py-2 !text-[0.62rem] sm:!px-8 sm:!py-4 sm:!text-[0.78rem]' onClick={() => choose('accepted')}>
                        <span className='sm:hidden'>Accept</span>
                        <span className='hidden sm:inline'>Accept all</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;

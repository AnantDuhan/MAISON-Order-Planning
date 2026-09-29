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

    return (
        <div
            role='dialog'
            aria-live='polite'
            aria-label='Cookie preferences'
            className='fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface px-6 py-5 shadow-lg sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-md sm:border'
        >
            <p className='eyebrow'>Cookies</p>
            <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                We use essential cookies to keep you signed in and remember your cart. With your
                permission, we'd also like to use analytics cookies to understand how the store is
                used. Read our{' '}
                <Link to='/privacy' className='underline underline-offset-2 text-ink'>
                    Privacy Policy
                </Link>
                .
            </p>
            <div className='mt-5 flex flex-wrap gap-3'>
                <button type='button' className='btn-solid' onClick={() => choose('accepted')}>
                    Accept all
                </button>
                <button type='button' className='btn-outline' onClick={() => choose('rejected')}>
                    Essential only
                </button>
            </div>
        </div>
    );
};

export default CookieConsent;

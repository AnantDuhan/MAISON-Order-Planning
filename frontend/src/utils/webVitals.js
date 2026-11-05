/*
 * Core Web Vitals from real visitors, for the admin "Site performance" page
 * (backend services/webVitals.js).
 *
 * Anonymous: only the kind of page (home, product…), phone or desktop, and
 * the numbers. No user, cookie id or full URL. Sent once per page view with
 * navigator.sendBeacon as the visitor leaves, so it never delays anything.
 * Admin pages aren't measured.
 *
 * VITE_VITALS_SAMPLE_RATE (0–1, default 1) measures only a share of visits.
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { API_BASE_URL } from './apiBase';

const SAMPLE_RATE = Math.min(1, Math.max(0, Number(import.meta.env.VITE_VITALS_SAMPLE_RATE ?? 1)));

/** The kind of page, from the path the visit started on. */
export const pageType = (path = '/') => {
    if (path === '/') return 'home';
    if (/^\/products?(\/|$)|^\/search/.test(path) && !/^\/product\//.test(path)) return 'listing';
    if (/^\/product\//.test(path)) return 'product';
    if (/^\/cart/.test(path)) return 'cart';
    if (/^\/(checkout|shipping|order\/confirm|payment|success)/.test(path)) return 'checkout';
    if (/^\/(account|orders|order\/|wishlist|membership|me\/|password)/.test(path)) return 'account';
    return 'other';
};

export const startWebVitals = () => {
    if (typeof window === 'undefined' || !navigator.sendBeacon) return;
    // LCP, CLS and TTFB belong to the page the visit landed on. Later pages in
    // the single-page app have no fresh load to measure.
    const path = window.location.pathname;
    if (path.startsWith('/admin') || Math.random() >= SAMPLE_RATE) return;

    const page = pageType(path);
    const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    const latest = new Map();
    let sent = false;

    const record = metric => latest.set(metric.name, metric.value);
    onLCP(record);
    onINP(record);
    onCLS(record);
    onFCP(record);
    onTTFB(record);

    const send = () => {
        if (sent || !latest.size) return;
        sent = true;
        const body = JSON.stringify({
            page,
            device,
            metrics: [...latest].map(([name, value]) => ({ name, value })),
        });
        navigator.sendBeacon(`${API_BASE_URL}/api/v1/vitals`, new Blob([body], { type: 'application/json' }));
    };

    // The final INP and CLS are only known when the page is hidden or left.
    // On document (where the event is fired), like web-vitals itself listens.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') send();
    });
    window.addEventListener('pagehide', send);
};

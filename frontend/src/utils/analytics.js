// Google Analytics 4, loaded ONLY after the visitor accepts analytics cookies.
// Set VITE_GA_ID (e.g. G-XXXXXXX) in the build env; without it this is a no-op.

const GA_ID = import.meta.env.VITE_GA_ID;
export const CONSENT_KEY = 'maison-cookie-consent'; // 'accepted' | 'rejected'

let loaded = false;

export const getConsent = () => {
    try {
        return localStorage.getItem(CONSENT_KEY);
    } catch {
        return null;
    }
};

export const setConsent = value => {
    try {
        localStorage.setItem(CONSENT_KEY, value);
    } catch {
        /* storage blocked — banner will just show again next visit */
    }
    if (value === 'accepted') initAnalytics();
};

export const initAnalytics = () => {
    if (loaded || !GA_ID || getConsent() !== 'accepted') return;
    loaded = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    // SPA: page views are sent manually on route change (trackPageView).
    window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
};

export const trackPageView = path => {
    if (!loaded || !window.gtag) return;
    window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href });
};

export const trackEvent = (name, params = {}) => {
    if (!loaded || !window.gtag) return;
    window.gtag('event', name, params);
};

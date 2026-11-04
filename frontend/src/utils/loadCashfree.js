// The Cashfree SDK is only needed on the payment and membership pages, so it
// loads there (on first visit to either) instead of on every page of the shop.
const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
// Must match the backend's CASHFREE_ENVIRONMENT (production or sandbox), or
// checkout opens the wrong Cashfree environment. Any case is accepted.
const MODE = String(import.meta.env.REACT_APP_CASHFREE_MODE || '').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
export const CASHFREE_MODE = MODE;

let pending = null;

export const loadCashfree = () => {
    if (window.Cashfree) return Promise.resolve(window.Cashfree({ mode: MODE }));
    if (!pending) {
        pending = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = SDK_URL;
            script.async = true;
            script.onload = () => (window.Cashfree
                ? resolve(window.Cashfree({ mode: MODE }))
                : reject(new Error('Cashfree checkout is unavailable. Please refresh and try again.')));
            script.onerror = () => {
                pending = null; // let the next attempt retry
                script.remove();
                reject(new Error('Cashfree checkout could not load. Check your connection and try again.'));
            };
            document.head.appendChild(script);
        });
    }
    return pending;
};

/** Start loading early (e.g. when the page opens) so paying is instant. */
export const preloadCashfree = () => {
    loadCashfree().catch(() => {});
};

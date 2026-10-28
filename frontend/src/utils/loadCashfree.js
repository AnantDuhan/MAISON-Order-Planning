// The Cashfree SDK is only needed on the payment and membership pages, so it
// loads there (on first visit to either) instead of on every page of the shop.
const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';
const MODE = import.meta.env.REACT_APP_CASHFREE_MODE || 'sandbox';

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

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `load` (e.g. () => dispatch(getAllOrders())) when the page opens and
 * reports `loaded` once THIS page's request has finished, success or not.
 *
 * Admin lists use it to tell "still loading" from "nothing there": the store
 * starts out as "not loading, empty list" (and the products list may still
 * hold the shop's products), so judging by the store alone showed
 * "No orders yet." for a moment before the data arrived.
 *
 * `reload()` fetches again (after a delete, say) without going back to the
 * loading state, so the table stays on screen.
 */
export const useLoadOnce = load => {
    const [loaded, setLoaded] = useState(false);
    const loadRef = useRef(load);
    loadRef.current = load;

    // A failed request still counts as finished (the page shows its error and
    // empty state); it never leaves the page loading forever.
    const reload = useCallback(
        () => Promise.resolve()
            .then(() => loadRef.current())
            .catch(() => {})
            .finally(() => setLoaded(true)),
        []
    );

    useEffect(() => {
        reload();
    }, [reload]);

    return { loaded, reload };
};

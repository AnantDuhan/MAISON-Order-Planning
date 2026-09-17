import axios from 'axios';
import { getAnonymousId } from './anonymousId';

// Client-side dedup so a component re-render doesn't fire the same view/click
// repeatedly within a session (the server dedups over a longer window too).
const sent = new Set();

export const trackInteraction = (productId, type) => {
    try {
        if (!productId || !type) return;

        if (type === 'view' || type === 'click') {
            const key = `${type}:${productId}`;
            if (sent.has(key)) return;
            sent.add(key);
        }

        // Fire-and-forget — tracking must never block or break the UI.
        axios
            .post('/api/v1/interaction', {
                productId,
                type,
                anonymousId: getAnonymousId(),
            })
            .catch(() => {});
    } catch {
        // ignore
    }
};

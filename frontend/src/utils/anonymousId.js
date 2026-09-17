// Stable per-device id for tracking guest (logged-out) behavior.
const KEY = 'anonymousId';

export const getAnonymousId = () => {
    try {
        let id = localStorage.getItem(KEY);
        if (!id) {
            id =
                (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
                `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(KEY, id);
        }
        return id;
    } catch {
        return null;
    }
};

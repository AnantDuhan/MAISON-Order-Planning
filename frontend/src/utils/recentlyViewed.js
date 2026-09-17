// Tracks "products you just viewed" in the browser (per-device, no backend).
const KEY = 'recentlyViewed';
const MAX = 10;

export const getRecentlyViewed = () => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const addRecentlyViewed = product => {
    try {
        if (!product || !product._id) return;
        // Store a lightweight copy — enough for ProductCard to render.
        const item = {
            _id: product._id,
            name: product.name,
            price: product.price,
            ratings: product.ratings,
            images: product.images,
            category: product.category,
        };
        const rest = getRecentlyViewed().filter(p => p._id !== item._id);
        const updated = [item, ...rest].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(updated));
    } catch {
        // Ignore storage errors (private mode, quota, disabled storage).
    }
};

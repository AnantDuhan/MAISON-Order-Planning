// Products this shopper has opened, newest first, kept in this browser only.
// Stored as small snapshots so the strip renders without an API call; prices
// may be a little stale, and the product page always shows the live price.
const KEY = 'maison:recentlyViewed';
const MAX = 8;

const read = () => {
    try {
        const list = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

export const getRecentlyViewed = (excludeId, limit = 4) =>
    read()
        .filter(p => p && p._id && p._id !== excludeId)
        .slice(0, limit);

export const recordRecentlyViewed = product => {
    if (!product?._id || product.isDemo) return;
    const snapshot = {
        _id: product._id,
        name: product.name,
        images: (product.images || []).slice(0, 2).map(img => ({ url: img.url })),
        price: product.price,
        priceFrom: product.priceFrom ?? null,
        priceTo: product.priceTo ?? null,
        ratings: product.ratings ?? 0,
        numOfReviews: product.numOfReviews ?? 0,
    };
    try {
        const next = [snapshot, ...read().filter(p => p._id !== product._id)].slice(0, MAX);
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        // Storage full or blocked (private mode): the strip simply stays empty.
    }
};

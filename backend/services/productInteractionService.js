import ProductInteraction from "../models/productInteraction.js";

const INTERACTION_WEIGHTS = {
    view: 1,
    click: 2,
    wishlist: 3,
    cart: 4,
    purchase: 6,
};

// High-frequency, low-intent events are deduplicated within a time window so a
// user refreshing a page can't flood the data and skew their preference vector.
// Intentional events (wishlist/cart/purchase) are always recorded.
const DEDUP_WINDOW_MS = {
    view: 30 * 60 * 1000, // 30 min
    click: 10 * 60 * 1000, // 10 min
};

export const recordProductInteraction = async ({
    userId,
    anonymousId,
    productId,
    type,
}) => {
    if ((!userId && !anonymousId) || !productId || !type) {
        return;
    }

    const weight = INTERACTION_WEIGHTS[type];
    if (!weight) {
        throw new Error(`Unsupported interaction type: ${type}`);
    }

    const identity = userId ? { user: userId } : { anonymousId };

    // Deduplicate within the window for eligible types.
    const windowMs = DEDUP_WINDOW_MS[type];
    if (windowMs) {
        const since = new Date(Date.now() - windowMs);
        const recent = await ProductInteraction.findOne({
            ...identity,
            product: productId,
            type,
            createdAt: { $gt: since },
        }).select("_id");
        if (recent) {
            return; // duplicate within window — skip
        }
    }

    await ProductInteraction.create({
        ...identity,
        product: productId,
        type,
        weight,
    });
};

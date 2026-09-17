import ProductInteraction from "../models/productInteraction.js";

const INTERACTION_WEIGHTS = {
    view: 1,
    click: 2,
    wishlist: 3,
    cart: 4,
    purchase: 6,
};

export const recordProductInteraction = async ({
    userId,
    productId,
    type,
}) => {
    if (!userId || !productId || !type) {
        return;
    }

    const weight = INTERACTION_WEIGHTS[type];

    if (!weight) {
        throw new Error(`Unsupported interaction type: ${type}`);
    }

    await ProductInteraction.create({
        user: userId,
        product: productId,
        type,
        weight,
    });
};
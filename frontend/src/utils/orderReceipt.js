/*
 * The order just placed, kept for the "order placed" page so it can show what
 * was bought, where it goes and when. Session storage: it survives a refresh
 * of that page but not the browser closing, and holds no payment details.
 */
const KEY = 'maison.lastReceipt';

export const saveReceipt = order => {
    if (!order?._id) return;
    const receipt = {
        id: String(order._id),
        placedAt: order.createdAt || new Date().toISOString(),
        items: (order.orderItems || []).map(item => ({
            product: item.product,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.images?.[0]?.url || null,
            variantLabel: item.variantLabel || '',
        })),
        itemsPrice: order.itemsPrice,
        shippingPrice: order.shippingPrice,
        discountedAmount: order.discountedAmount || 0,
        totalPrice: order.totalPrice,
        estimatedDeliveryDate: order.estimatedDeliveryDate || null,
        shippingInfo: order.shippingInfo
            ? {
                address: order.shippingInfo.address,
                city: order.shippingInfo.city,
                state: order.shippingInfo.state,
                pinCode: order.shippingInfo.pinCode,
            }
            : null,
    };
    try {
        sessionStorage.setItem(KEY, JSON.stringify(receipt));
    } catch {
        // Private mode or storage full: the page falls back to the short version.
    }
};

export const getReceipt = () => {
    try {
        return JSON.parse(sessionStorage.getItem(KEY));
    } catch {
        return null;
    }
};

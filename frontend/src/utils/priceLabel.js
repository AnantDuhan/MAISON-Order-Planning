// "₹2,499", or "From ₹2,499" when a product's variants have different prices.
export const priceLabel = product => {
    const from = product?.priceFrom;
    const to = product?.priceTo;
    if (from != null && to != null && from !== to) return `From ₹${from}`;
    return `₹${from ?? product?.price}`;
};

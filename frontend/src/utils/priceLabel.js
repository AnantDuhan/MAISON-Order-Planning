// Indian digit grouping: 164900 -> "₹1,64,900"; paise shown only when present.
export const formatINR = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '₹—';
    const paise = Number.isInteger(n) ? 0 : 2;
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: paise, maximumFractionDigits: 2 })}`;
};

// "₹2,499", or "From ₹2,499" when a product's variants have different prices.
export const priceLabel = product => {
    const from = product?.priceFrom;
    const to = product?.priceTo;
    if (from != null && to != null && from !== to) return `From ${formatINR(from)}`;
    return formatINR(from ?? product?.price);
};

// Short, factual lines for product cards, built only from the product's own data.

/** "256 GB / 512 GB · 2 colours", "Sizes S–XL · 3 colours", or '' when there are no options. */
export const optionsSummary = product => {
    const parts = (product?.options || []).map(option => {
        const values = (option.values || []).map(v => v.value).filter(Boolean);
        if (!values.length) return null;
        if (option.kind === 'color') return `${values.length} ${values.length === 1 ? 'colour' : 'colours'}`;
        if (option.kind === 'size') return values.length > 2 ? `Sizes ${values[0]}–${values[values.length - 1]}` : `Sizes ${values.join(', ')}`;
        return values.length <= 3 ? values.join(' / ') : `${values.length} ${option.name.toLowerCase()} options`;
    });
    return parts.filter(Boolean).slice(0, 2).join(' · ');
};

/** { label, tone } — tone is 'ok' | 'low' | 'out'. */
export const stockStatus = product => {
    const stock = Number(product?.Stock ?? 0);
    if (stock <= 0) return { label: 'Sold out', tone: 'out' };
    if (stock <= 3) return { label: `Only ${stock} left`, tone: 'low' };
    return { label: 'In stock', tone: 'ok' };
};

import React from 'react';

const imageOf = item => (item?.images || []).find(img => img?.url)?.url || item?.image || null;
const idOf = value => (value && typeof value === 'object' ? value._id : value) || null;

/**
 * The pieces behind a return or refund, as { key, name, image, detail }.
 *
 * Names and photos come from the order's own lines (what was actually
 * bought, still there if the product was later edited or deleted). For a
 * return, only the returned products are listed, with their returned
 * quantity; the product record is the fallback when an order line is missing.
 */
export const itemsFor = ({ order, products } = {}) => {
    const lines = Array.isArray(order?.orderItems) ? order.orderItems : [];
    const returned = Array.isArray(products) ? products.filter(p => p?.product) : [];

    if (returned.length) {
        return returned.map((p, i) => {
            const productId = idOf(p.product);
            const line = lines.find(l => idOf(l.product) === productId);
            const product = typeof p.product === 'object' ? p.product : null;
            return {
                key: `${productId}-${i}`,
                name: line?.name || product?.name || 'Product no longer available',
                image: imageOf(line) || imageOf(product),
                detail: [line?.variantLabel, `Qty ${p.quantity ?? line?.quantity ?? 1}`].filter(Boolean).join(' · '),
            };
        });
    }

    return lines.map((line, i) => ({
        key: `${idOf(line.product)}-${i}`,
        name: line.name,
        image: imageOf(line),
        detail: [line.variantLabel, `Qty ${line.quantity ?? 1}`].filter(Boolean).join(' · '),
    }));
};

const Thumb = ({ src, size = 'h-14 w-11' }) => (
    <span className={`${size} shrink-0 overflow-hidden border border-line bg-surface-2`}>
        {src && <img src={src} alt='' loading='lazy' decoding='async' className='h-full w-full object-cover' />}
    </span>
);

/** Photo + name + variant/quantity for each piece; long lists collapse to "+ N more". */
const OrderItems = ({ items, max = 2 }) => {
    if (!items?.length) return <span className='font-sans text-sm text-ink-faint'>—</span>;
    const shown = items.slice(0, max);
    const rest = items.slice(max);
    return (
        <div className='flex min-w-0 flex-col gap-2'>
            {shown.map(item => (
                <div key={item.key} className='flex min-w-0 items-center gap-3'>
                    <Thumb src={item.image} />
                    <div className='min-w-0'>
                        <p className='line-clamp-2 font-sans text-sm leading-snug text-ink'>{item.name}</p>
                        {item.detail && <p className='mt-0.5 font-sans text-xs text-ink-faint'>{item.detail}</p>}
                    </div>
                </div>
            ))}
            {rest.length > 0 && (
                <div className='flex items-center gap-2' title={rest.map(i => i.name).join(', ')}>
                    <span className='flex -space-x-2'>
                        {rest.slice(0, 3).map(item => <Thumb key={item.key} src={item.image} size='h-7 w-6' />)}
                    </span>
                    <span className='font-sans text-xs text-ink-faint'>+ {rest.length} more</span>
                </div>
            )}
        </div>
    );
};

export default OrderItems;

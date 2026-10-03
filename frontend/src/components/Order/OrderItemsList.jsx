import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// ₹2,499 for whole rupees, ₹3,687.30 otherwise.
const inr = value => {
    const n = Number(value || 0);
    const fraction = Number.isInteger(n) ? 0 : 2;
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: fraction, maximumFractionDigits: 2 })}`;
};

/** Large product photo; extra photos as small thumbnails you can switch to. */
const ItemPhoto = ({ item }) => {
    const images = (item.images || []).filter(img => img?.url);
    const [active, setActive] = useState(0);
    const src = images[active]?.url || item.image;

    return (
        <div className='w-28 shrink-0 sm:w-44 lg:w-48'>
            <Link to={`/product/${item.product}`} className='block overflow-hidden border border-line bg-surface-2'>
                {src ? (
                    <img src={src} alt={item.name} loading='lazy' className='aspect-[4/5] w-full object-cover transition-transform duration-500 hover:scale-[1.03]' />
                ) : (
                    <div className='aspect-[4/5] w-full' />
                )}
            </Link>
            {images.length > 1 && (
                <div className='mt-2 flex gap-2'>
                    {images.slice(0, 4).map((img, index) => (
                        <button
                            key={img._id || index}
                            type='button'
                            onClick={() => setActive(index)}
                            aria-label={`Show photo ${index + 1} of ${item.name}`}
                            className={`h-8 w-8 overflow-hidden border sm:h-10 sm:w-10 ${index === active ? 'border-brass' : 'border-line opacity-70 hover:opacity-100'}`}
                        >
                            <img src={img.url} alt='' className='h-full w-full object-cover' />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/** Order lines with large photos. Shared by the customer and admin order pages. */
const OrderItemsList = ({ items = [] }) => (
    <ul className='divide-y divide-line border border-line bg-surface'>
        {items.map(item => (
            <li key={item._id || item.product} className='flex gap-5 p-5 sm:gap-6 sm:p-6'>
                <ItemPhoto item={item} />
                <div className='flex flex-1 flex-col gap-4 sm:flex-row sm:justify-between'>
                    <div>
                        <Link
                            to={`/product/${item.product}`}
                            className='font-display text-xl font-medium leading-snug text-ink hover:text-brass sm:text-2xl'
                        >
                            {item.name}
                        </Link>
                        <p className='mt-2 font-sans text-sm text-ink-soft'>
                            {inr(item.price)} × {item.quantity}
                        </p>
                    </div>
                    <p className='font-display text-xl text-ink sm:text-right sm:text-2xl'>{inr(item.price * item.quantity)}</p>
                </div>
            </li>
        ))}
    </ul>
);

export { inr };
export default OrderItemsList;

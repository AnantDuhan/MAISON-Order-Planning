import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { SITE_URL } from '../layout/MetaData';
import { cleanText } from '../../utils/cleanText';
import { estimatedDeliveryLabel, FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from '../../utils/delivery';
import { formatINR } from '../../utils/priceLabel';
import { getRecentlyViewed, recordRecentlyViewed } from '../../utils/recentlyViewed';
import ProductStrip from './ProductStrip';

const link = 'underline underline-offset-2 text-ink hover:text-brass';

/** Home › Shop › Category › Product */
export const Breadcrumbs = ({ product }) => (
    <nav aria-label='Breadcrumb' className='mb-8 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint'>
        <ol className='flex flex-wrap items-center gap-2'>
            <li><Link to='/' className='hover:text-ink'>Home</Link></li>
            <li aria-hidden='true'>/</li>
            <li><Link to='/products' className='hover:text-ink'>Shop</Link></li>
            {product.category && (
                <>
                    <li aria-hidden='true'>/</li>
                    <li>{product.category}</li>
                </>
            )}
            <li aria-hidden='true'>/</li>
            <li aria-current='page' className='max-w-[16rem] truncate text-ink-soft'>{product.name}</li>
        </ol>
    </nav>
);

/** Estimated delivery date and the shipping rule, shown while the item can be bought. */
export const DeliveryLine = () => (
    <div className='mt-4 flex flex-col gap-1 font-sans text-sm text-ink-soft'>
        <p>
            Order today for delivery by <span className='text-ink'>{estimatedDeliveryLabel()}</span>
        </p>
        <p className='text-ink-faint'>
            Free shipping over {formatINR(FREE_SHIPPING_THRESHOLD)}, and always for members · otherwise {formatINR(SHIPPING_CHARGE)}
        </p>
    </div>
);

const Panel = ({ title, children }) => (
    <details className='group border-b border-line py-5'>
        <summary className='flex cursor-pointer list-none items-center justify-between font-sans text-[0.72rem] uppercase tracking-luxe text-ink [&::-webkit-details-marker]:hidden'>
            {title}
            <span aria-hidden='true' className='text-lg leading-none text-ink-faint transition-transform group-open:rotate-45'>+</span>
        </summary>
        <div className='mt-4 flex flex-col gap-3 font-sans text-sm leading-relaxed text-ink-soft'>{children}</div>
    </details>
);

/** Shipping, returns and payment answers next to the buy button. */
export const ShippingReturns = () => (
    <div className='mt-10 border-t border-line'>
        <Panel title='Shipping & Delivery'>
            <p>
                Complimentary shipping on orders over {formatINR(FREE_SHIPPING_THRESHOLD)}, and on every order for Maison members; otherwise a flat {formatINR(SHIPPING_CHARGE)}.
                Most orders arrive within about five days, and you can follow yours on your{' '}
                <Link to='/orders' className={link}>orders page</Link>.
            </p>
            <p><Link to='/shipping-policy' className={link}>Shipping policy</Link></p>
        </Panel>
        <Panel title='Returns & Refunds'>
            <p>
                Request a return from the order page within 7 days of delivery (14 days for members). Approved returns are refunded in full to
                your original payment method.
            </p>
            <p><Link to='/refund-policy' className={link}>Refunds &amp; cancellations policy</Link></p>
        </Panel>
        <Panel title='Secure Payment'>
            <p>
                Payments are processed by Cashfree; we never see or store your card details. An invoice is emailed with every
                order and can be downloaded from your account.
            </p>
        </Panel>
    </div>
);

/** "You may also like" — same category first, then the newest pieces. */
export const RelatedProducts = ({ productId }) => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        let cancelled = false;
        setProducts([]);
        axios
            .get(`/api/v1/product/${productId}/related`)
            .then(({ data }) => { if (!cancelled) setProducts(data.products || []); })
            .catch(() => {}); // Optional section: hide it rather than show an error.
        return () => { cancelled = true; };
    }, [productId]);

    return <ProductStrip eyebrow='Complete the Picture' title='You May Also Like' products={products} viewAll='/products' />;
};

/** Records this product, then shows the shopper's other recent views. */
export const RecentlyViewed = ({ product }) => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        if (!product?._id) return;
        // Read before recording so the current product never shows in its own strip.
        setProducts(getRecentlyViewed(product._id));
        recordRecentlyViewed(product);
    }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    return <ProductStrip eyebrow='Your Trail' title='Recently Viewed' products={products} />;
};

const availabilityOf = stock => `https://schema.org/${stock >= 1 ? 'InStock' : 'OutOfStock'}`;

/** schema.org Product data, so search engines can show price, stock and rating. */
export const ProductJsonLd = ({ product }) => {
    const url = `${SITE_URL}/product/${product._id}`;
    const variants = (product.variants || []).filter(v => v.active !== false);
    const hasRange = product.priceFrom != null && product.priceTo != null && product.priceFrom !== product.priceTo;
    const price = product.priceFrom ?? product.price;

    const offers = hasRange
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            lowPrice: product.priceFrom,
            highPrice: product.priceTo,
            offerCount: variants.length || undefined,
            availability: availabilityOf(product.Stock),
            url,
        }
        : {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price,
            availability: availabilityOf(product.Stock),
            itemCondition: 'https://schema.org/NewCondition',
            url,
        };

    const data = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        sku: product._id,
        category: product.category || undefined,
        description: cleanText(product.metaDescription || product.description).slice(0, 500),
        image: (product.images || []).map(img => img.url).filter(Boolean),
        url,
        offers,
        // Google rejects aggregateRating with zero reviews, so only add it when real.
        ...(product.numOfReviews > 0 && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(product.ratings || 0).toFixed(1),
                reviewCount: product.numOfReviews,
            },
        }),
    };

    return (
        <Helmet>
            <script type='application/ld+json'>{JSON.stringify(data)}</script>
        </Helmet>
    );
};

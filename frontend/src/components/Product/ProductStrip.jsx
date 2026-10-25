import React from 'react';
import { Link } from 'react-router-dom';

import ProductCard from '../Home/ProductCard';

/** A titled row of product cards; renders nothing when there are no products. */
const ProductStrip = ({ eyebrow, title, products, viewAll }) => {
    if (!products?.length) return null;
    return (
        <section className='mt-24'>
            <div className='mb-10 flex items-end justify-between'>
                <div>
                    <p className='eyebrow'>{eyebrow}</p>
                    <h2 className='heading-display mt-3 text-display'>{title}</h2>
                </div>
                {viewAll && (
                    <Link to={viewAll} className='link-reveal hidden font-sans text-sm uppercase tracking-luxe sm:block'>
                        View all
                    </Link>
                )}
            </div>
            <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4'>
                {products.map(product => (
                    <ProductCard key={product._id} product={product} />
                ))}
            </div>
        </section>
    );
};

export default ProductStrip;

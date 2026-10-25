import React from 'react';
import { Link } from 'react-router-dom';
import { priceLabel } from '../../utils/priceLabel';
import { cleanText } from '../../utils/cleanText';

const ProductGridItem = ({ product }) => {
    if (!product) return null;

    const defaultImageUrl = 'https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg';
    const imageUrl =
        product.images && product.images.length > 0 ? product.images[0]?.url : defaultImageUrl;

    return (
        <Link to={`/product/${product._id}`} className='group relative block overflow-hidden bg-surface-2'>
            <div className='aspect-[3/4] w-full overflow-hidden'>
                <img
                    src={imageUrl}
                    alt={product.name}
                        loading='lazy'
                        decoding='async'
                    className='h-full w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105'
                />
            </div>

            {/* Overlay: revealed on hover with a mouse, always visible on touch screens */}
            <div className='absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 via-ink/20 to-transparent p-4 transition-opacity duration-500 ease-luxe sm:p-6 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'>
                <span className='eyebrow !text-brass-soft'>New Arrival</span>
                <h3 className='mt-2 font-display text-xl font-medium text-white sm:text-2xl'>{product.name}</h3>
                <p className='mt-1 line-clamp-2 hidden font-sans text-sm text-white/70 sm:block'>{cleanText(product.description)}</p>
                <p className='mt-3 font-sans text-sm tracking-wide text-white'>{priceLabel(product)}</p>
            </div>
        </Link>
    );
};

export default ProductGridItem;

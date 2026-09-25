import React from 'react';
import { Link } from 'react-router-dom';

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
                    className='h-full w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105'
                />
            </div>

            {/* Overlay */}
            <div className='absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 via-ink/20 to-transparent p-6 opacity-0 transition-opacity duration-500 ease-luxe group-hover:opacity-100'>
                <span className='eyebrow !text-brass-soft'>New Arrival</span>
                <h3 className='mt-2 font-display text-2xl font-medium text-white'>{product.name}</h3>
                <p className='mt-1 line-clamp-2 font-sans text-sm text-white/70'>{product.description}</p>
                <p className='mt-3 font-sans text-sm tracking-wide text-white'>{`₹${product.price}`}</p>
            </div>
        </Link>
    );
};

export default ProductGridItem;

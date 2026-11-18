import { Rating } from '@mui/material';
import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { removeProductFromWishlist } from '../../actions/productAction';
import { priceLabel } from '../../utils/priceLabel';

const WishlistProductCard = ({ product }) => {
    const dispatch = useDispatch();
    const defaultImageUrl = 'https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg';

    const options = {
        size: 'small',
        value: product.ratings,
        readOnly: true,
        precision: 0.2,
    };

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = product.images && product.images.length > 0 ? product.images : [];

    const deleteWishlistProduct = e => {
        e.preventDefault();
        e.stopPropagation();
        toast.success('Product Removed from wishlist');
        dispatch(removeProductFromWishlist(product._id));
    };

    useEffect(() => {
        if (images.length === 0) return;
        const intervalId = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % images.length);
        }, 2500);
        return () => clearInterval(intervalId);
    }, [images.length]);

    const imageUrl = images.length > 0 ? images[currentImageIndex]?.url : defaultImageUrl;

    return (
        <Fragment>
            <Link className='group card-luxe block' to={`/product/${product._id}`}>
                <div className='relative aspect-[4/5] overflow-hidden bg-surface-2'>
                    <img
                        src={imageUrl}
                        alt={product.name}
                        loading='lazy'
                        decoding='async'
                        className='h-full w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105'
                    />
                    <button
                        onClick={deleteWishlistProduct}
                        aria-label='Remove from wishlist'
                        className='absolute right-2 top-2 grid h-9 w-9 sm:right-3 sm:top-3 place-items-center rounded-full bg-canvas/80 text-ink backdrop-blur transition-all duration-500 ease-luxe hover:text-danger'
                    >
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                            <path d='M6 6l12 12M18 6L6 18' />
                        </svg>
                    </button>
                </div>
                <div className='px-3 py-3 sm:px-5 sm:py-5'>
                    <h3 className='line-clamp-2 font-display text-[1.05rem] font-medium leading-snug text-ink sm:truncate sm:text-xl sm:leading-normal'>{product.name}</h3>
                    <div className='mt-1.5 flex items-center gap-1.5 sm:mt-2 sm:gap-2'>
                        <Rating {...options} sx={{ fontSize: { xs: '0.95rem', sm: '1.125rem' } }} />
                        <span className='font-sans text-[0.7rem] text-ink-faint'>({product.numOfReviews})</span>
                    </div>
                    <p className='mt-2 font-sans text-sm tracking-wide text-ink-soft sm:mt-3'>{priceLabel(product)}</p>
                </div>
            </Link>
        </Fragment>
    );
};

export default WishlistProductCard;

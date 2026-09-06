import { Rating } from '@mui/material';
import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { removeProductFromWishlist } from '../../actions/productAction';

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
                        className='h-full w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105'
                    />
                    <button
                        onClick={deleteWishlistProduct}
                        aria-label='Remove from wishlist'
                        className='absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-canvas/80 text-ink backdrop-blur transition-all duration-500 ease-luxe hover:text-danger'
                    >
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                            <path d='M6 6l12 12M18 6L6 18' />
                        </svg>
                    </button>
                </div>
                <div className='px-5 py-5'>
                    <h3 className='truncate font-display text-xl font-medium text-ink'>{product.name}</h3>
                    <div className='mt-2 flex items-center gap-2'>
                        <Rating {...options} />
                        <span className='font-sans text-[0.7rem] text-ink-faint'>({product.numOfReviews})</span>
                    </div>
                    <p className='mt-3 font-sans text-sm tracking-wide text-ink-soft'>{`₹${product.price}`}</p>
                </div>
            </Link>
        </Fragment>
    );
};

export default WishlistProductCard;

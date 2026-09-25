import { Rating } from '@mui/material';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { addProductToWishlist } from '../../actions/productAction';
import { toast } from 'react-toastify';

const ProductCard = ({ product }) => {
    const dispatch = useDispatch();
    const defaultImageUrl = 'https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg';

    const options = {
        size: 'small',
        value: product?.ratings,
        readOnly: true,
        precision: 0.2,
    };

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = product?.images || defaultImageUrl;

    const addToWishlist = e => {
        e.preventDefault();
        e.stopPropagation();
        toast.success('Product added to wishlist');
        dispatch(addProductToWishlist(product._id));
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            const nextIndex = (currentImageIndex + 1) % images.length;
            setCurrentImageIndex(nextIndex);
        }, 2500);
        return () => clearInterval(intervalId);
    }, [currentImageIndex, images.length]);

    if (!product) return null;

    const imageUrl = images.length > 0 ? images[currentImageIndex]?.url : defaultImageUrl;

    return (
        <Fragment>
            <Link className='group card-luxe block' to={`/product/${product._id}`}>
                {/* Image */}
                <div className='relative aspect-[4/5] overflow-hidden bg-surface-2'>
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className='h-full w-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105'
                    />
                    <button
                        onClick={addToWishlist}
                        aria-label='Add to wishlist'
                        className='absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-canvas/80 text-ink opacity-0 backdrop-blur transition-all duration-500 ease-luxe hover:text-brass group-hover:opacity-100'
                    >
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                            <path d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z' />
                        </svg>
                    </button>
                    <span className='pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full bg-ink/90 py-3 text-center font-sans text-[0.7rem] uppercase tracking-luxe text-canvas transition-transform duration-500 ease-luxe group-hover:translate-y-0'>
                        View Piece
                    </span>
                </div>

                {/* Meta */}
                <div className='px-5 py-5'>
                    <h3 className='truncate font-display text-xl font-medium text-ink'>{product.name}</h3>
                    <div className='mt-2 flex items-center gap-2'>
                        <Rating {...options} />
                        <span className='font-sans text-[0.7rem] text-ink-faint'>
                            ({product.numOfReviews})
                        </span>
                    </div>
                    <p className='mt-3 font-sans text-sm tracking-wide text-ink-soft'>{`₹${product.price}`}</p>
                </div>
            </Link>
        </Fragment>
    );
};

export default ProductCard;

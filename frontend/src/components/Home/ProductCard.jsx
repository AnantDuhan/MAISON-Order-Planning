import { Rating } from '@mui/material';
import React, { Fragment, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { addProductToWishlist } from '../../actions/productAction';
import { toast } from 'react-toastify';
import { priceLabel } from '../../utils/priceLabel';
import { useCanHover } from '../../utils/useCanHover';

const DEFAULT_IMAGE = 'https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg';

/**
 * Photos without auto-play: on a mouse, hovering swaps to the second photo;
 * on a touch screen, the photos are a swipeable strip with dots.
 */
const CardPhotos = ({ product }) => {
    const canHover = useCanHover();
    const [active, setActive] = useState(0);
    const urls = (product.images || []).map(img => img?.url).filter(Boolean).slice(0, 4);
    const photos = urls.length ? urls : [DEFAULT_IMAGE];

    if (canHover || photos.length === 1) {
        return (
            <>
                <img
                    src={photos[0]}
                    alt={product.name}
                    loading='lazy'
                    decoding='async'
                    className={`h-full w-full object-cover transition-all duration-700 ease-luxe group-hover:scale-105 ${photos[1] && canHover ? 'group-hover:opacity-0' : ''}`}
                />
                {photos[1] && canHover && (
                    <img
                        src={photos[1]}
                        alt=''
                        loading='lazy'
                        decoding='async'
                        className='absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 ease-luxe group-hover:scale-105 group-hover:opacity-100'
                    />
                )}
            </>
        );
    }

    const onScroll = e => {
        const el = e.currentTarget;
        setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    };

    return (
        <>
            <div className='no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto' onScroll={onScroll}>
                {photos.map((src, i) => (
                    <img
                        key={src + i}
                        src={src}
                        alt={i === 0 ? product.name : `${product.name}, photo ${i + 1}`}
                        loading='lazy'
                        decoding='async'
                        draggable='false'
                        className='h-full w-full shrink-0 snap-center object-cover'
                    />
                ))}
            </div>
            <div className='pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5' aria-hidden='true'>
                {photos.map((_, i) => (
                    <span key={i} className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${i === active ? 'w-4 opacity-100' : 'w-1.5 opacity-60'}`} />
                ))}
            </div>
        </>
    );
};

const ProductCard = ({ product }) => {
    const dispatch = useDispatch();

    if (!product) return null;

    const options = {
        size: 'small',
        value: product?.ratings,
        readOnly: true,
        precision: 0.2,
    };

    const addToWishlist = e => {
        e.preventDefault();
        e.stopPropagation();
        toast.success('Product added to wishlist');
        dispatch(addProductToWishlist(product._id));
    };

    return (
        <Fragment>
            <Link className='group card-luxe block' to={`/product/${product._id}`}>
                {/* Image */}
                <div className='relative aspect-[4/5] overflow-hidden bg-surface-2'>
                    <CardPhotos product={product} />
                    <button
                        onClick={addToWishlist}
                        aria-label='Add to wishlist'
                        className='absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-canvas/80 text-ink backdrop-blur transition-all duration-500 ease-luxe hover:text-brass [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                    >
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                            <path d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z' />
                        </svg>
                    </button>
                    <span className='pointer-events-none absolute bottom-0 left-0 right-0 hidden translate-y-full bg-ink/90 py-3 text-center font-sans text-[0.7rem] uppercase tracking-luxe text-canvas transition-transform duration-500 ease-luxe group-hover:translate-y-0 [@media(hover:hover)]:block'>
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
                    <p className='mt-3 font-sans text-sm tracking-wide text-ink-soft'>{priceLabel(product)}</p>
                </div>
            </Link>
        </Fragment>
    );
};

export default ProductCard;

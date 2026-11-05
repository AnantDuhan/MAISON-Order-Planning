import { Rating } from '@mui/material';
import React, { Fragment, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { addItemsToCart } from '../../actions/cartAction';
import { addProductToWishlist } from '../../actions/productAction';
import { toast } from 'react-toastify';
import { priceLabel } from '../../utils/priceLabel';
import { useCanHover } from '../../utils/useCanHover';
import { optionsSummary, stockStatus } from '../../utils/productFacts';
import { useMembershipTier } from '../../utils/useIsMember';
import { CARD_SIZES, imageProps } from '../../utils/responsiveImage';

// The product page caps a single line at 10; the card follows the same rule.
const MAX_PER_LINE = 10;

const BagIcon = () => (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' aria-hidden='true'>
        <path d='M6 7h12l-1 13H7L6 7z' /><path d='M9 7V6a3 3 0 0 1 6 0v1' />
    </svg>
);

const DEFAULT_IMAGE = 'https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg';

/**
 * Photos without auto-play: on a mouse, hovering swaps to the second photo;
 * on a touch screen, the photos are a swipeable strip with dots.
 */
const CardPhotos = ({ product, sizes, priority }) => {
    const canHover = useCanHover();
    const [active, setActive] = useState(0);
    const found = (product.images || []).filter(img => img?.url).slice(0, 4);
    const photos = found.length ? found : [{ url: DEFAULT_IMAGE }];
    // Cards in the first row are on screen at once: load them now, not lazily.
    const first = priority ? { loading: 'eager', fetchpriority: 'high' } : { loading: 'lazy' };

    if (canHover || photos.length === 1) {
        return (
            <>
                <img
                    {...imageProps(photos[0], sizes)}
                    alt={product.name}
                    {...first}
                    decoding='async'
                    className={`h-full w-full object-cover transition-all duration-700 ease-luxe group-hover:scale-105 ${photos[1] && canHover ? 'group-hover:opacity-0' : ''}`}
                />
                {photos[1] && canHover && (
                    <img
                        {...imageProps(photos[1], sizes)}
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
                {photos.map((photo, i) => (
                    <img
                        key={photo.url + i}
                        {...imageProps(photo, sizes)}
                        alt={i === 0 ? product.name : `${product.name}, photo ${i + 1}`}
                        {...(i === 0 ? first : { loading: 'lazy' })}
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

/**
 * sizes: how wide the card shows (CARD_SIZES for 3-column grids, CARD_SIZES_4_COL for 4).
 * priority: true for cards in the first row, so their photo isn't lazy-loaded.
 */
const ProductCard = ({ product, sizes = CARD_SIZES, priority = false }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const tier = useMembershipTier();
    const cartItems = useSelector(state => state.cart?.cartItems) || [];
    const [adding, setAdding] = useState(false);

    if (!product) return null;

    const summary = optionsSummary(product);
    const stock = stockStatus(product);

    const options = {
        size: 'small',
        value: product?.ratings,
        readOnly: true,
        precision: 0.2,
    };

    // What the card's bag button does: add one, pick options on the product
    // page, or nothing (sold out / Plus early access for non-Plus shoppers).
    const hasOptions = (product.options || []).length > 0;
    const earlyAccessLive = Boolean(product.earlyAccessUntil && new Date(product.earlyAccessUntil) > new Date());
    const locked = earlyAccessLive && tier !== 'plus';
    const canBuy = stock.tone !== 'out' && !locked;
    const quickAction = !canBuy ? null : hasOptions ? 'options' : 'add';

    const quickAdd = async e => {
        e.preventDefault();
        e.stopPropagation();
        if (quickAction === 'options') {
            navigate(`/product/${product._id}`);
            return;
        }
        // The cart stores a line's total quantity, so add one to what's there.
        const line = cartItems.find(i => i.product === product._id && !i.variant);
        const inBag = line?.quantity || 0;
        const cap = Math.min(MAX_PER_LINE, Number(product.Stock) || 0);
        if (inBag >= cap) {
            toast.info(inBag ? `You already have ${inBag} in your bag, the most available` : 'This piece is sold out');
            return;
        }
        setAdding(true);
        try {
            await dispatch(addItemsToCart(product._id, inBag + 1));
            toast.success(inBag ? `${product.name} · ${inBag + 1} in your bag` : `${product.name} added to your bag`);
        } catch (error) {
            toast.error(error.message || 'Could not add to your bag');
        } finally {
            setAdding(false);
        }
    };

    const quickLabel = quickAction === 'options' ? 'Choose options' : adding ? 'Adding…' : 'Add to bag';

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
                    <CardPhotos product={product} sizes={sizes} priority={priority} />
                    <button
                        onClick={addToWishlist}
                        aria-label='Add to wishlist'
                        className='absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-canvas/80 text-ink backdrop-blur transition-all duration-500 ease-luxe hover:text-brass [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                    >
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                            <path d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z' />
                        </svg>
                    </button>
                    {quickAction ? (
                        <>
                            {/* Mouse: a bar slides up on hover. */}
                            <button
                                type='button'
                                onClick={quickAdd}
                                disabled={adding}
                                className='absolute bottom-0 left-0 right-0 hidden translate-y-full items-center justify-center gap-2 bg-ink/90 py-3 font-sans text-[0.7rem] uppercase tracking-luxe text-canvas transition-transform duration-500 ease-luxe hover:bg-ink focus-visible:translate-y-0 group-hover:translate-y-0 disabled:opacity-80 [@media(hover:hover)]:flex'
                            >
                                <BagIcon />
                                {quickLabel}
                            </button>
                            {/* Touch: a bag button that is always there (options open the product). */}
                            {quickAction === 'add' && (
                                <button
                                    type='button'
                                    onClick={quickAdd}
                                    disabled={adding}
                                    aria-label={`Add ${product.name} to bag`}
                                    className='absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-canvas/90 text-ink shadow-sm backdrop-blur transition-colors active:bg-brass active:text-canvas disabled:opacity-60 [@media(hover:hover)]:hidden'
                                >
                                    <BagIcon />
                                </button>
                            )}
                        </>
                    ) : (
                        <span className='pointer-events-none absolute bottom-0 left-0 right-0 hidden translate-y-full bg-ink/90 py-3 text-center font-sans text-[0.7rem] uppercase tracking-luxe text-canvas transition-transform duration-500 ease-luxe group-hover:translate-y-0 [@media(hover:hover)]:block'>
                            View Piece
                        </span>
                    )}
                </div>

                {/* Meta: category, name, real options, price and stock */}
                <div className='px-5 py-5'>
                    <div className='flex items-baseline justify-between gap-2'>
                        {product.category && (
                            <p className='truncate font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>{product.category}</p>
                        )}
                        {product.earlyAccessUntil && new Date(product.earlyAccessUntil) > new Date() && (
                            <p className='shrink-0 font-sans text-[0.62rem] uppercase tracking-luxe text-brass'>Plus early access</p>
                        )}
                    </div>
                    <h3 className='mt-1 truncate font-display text-xl font-medium text-ink'>{product.name}</h3>
                    {summary && <p className='mt-1 truncate font-sans text-xs text-ink-soft'>{summary}</p>}
                    {product.numOfReviews > 0 && (
                        <div className='mt-2 flex items-center gap-2'>
                            <Rating {...options} />
                            <span className='font-sans text-[0.7rem] text-ink-faint'>({product.numOfReviews})</span>
                        </div>
                    )}
                    <div className='mt-3 flex items-baseline justify-between gap-3'>
                        <p className='font-sans text-sm tracking-wide text-ink'>{priceLabel(product)}</p>
                        <p className={`shrink-0 font-sans text-[0.68rem] uppercase tracking-luxe ${stock.tone === 'out' ? 'text-danger' : stock.tone === 'low' ? 'text-brass' : 'text-ink-faint'}`}>{stock.label}</p>
                    </div>
                </div>
            </Link>
        </Fragment>
    );
};

export default ProductCard;

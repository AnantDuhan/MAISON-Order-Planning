import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Rating } from '@mui/material';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Carousel } from 'react-responsive-carousel';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { addItemsToCart } from '../../actions/cartAction';
import { addProductToWishlist, clearErrors, getProductDetails, newReview, summarizeProductReviews } from '../../actions/productAction';
import { NEW_REVIEW_RESET, REALTIME_PRODUCT_UPDATE, SUMMARIZE_REVIEWS_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import ReviewCard from './ReviewCard';

import 'react-responsive-carousel/lib/styles/carousel.min.css';

import io from 'socket.io-client';

const ProductDetails = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    const { product, loading, error } = useSelector(state => state.productDetails);
    const { user } = useSelector(state => state.user);
    const { wishlist } = useSelector(state => state.wishlist);
    const { success, error: reviewError } = useSelector(state => state.newReview);
    const {
        loading: summaryLoading,
        error: summaryError,
        isSummarized,
    } = useSelector(state => state.reviewSummary);

    const [progress, setProgress] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [lightboxIsOpen, setLightboxIsOpen] = useState(false);
    const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const options = {
        size: 'medium',
        value: product?.ratings,
        readOnly: true,
        precision: 0.5,
    };

    const generateSummaryHandler = () => {
        dispatch(summarizeProductReviews(id));
    };

    const addToCartHandler = () => {
        dispatch(addItemsToCart(id, quantity));
        toast.success('Item Added To Cart');
        setProgress(progress + 80);
    };

    const wishlistHandler = () => {
        const isProductInWishlist = wishlist.some(item => (item.product || item._id) === id);
        if (isProductInWishlist) {
            toast.info('Product is already in the wishlist');
        } else {
            dispatch(addProductToWishlist(id));
            toast.success('Item Added To Wishlist');
        }
        setProgress(progress + 80);
    };

    const submitReviewToggle = () => {
        open ? setOpen(false) : setOpen(true);
    };

    const reviewSubmitHandler = () => {
        const reviewData = new FormData();
        reviewData.set('productId', id);
        reviewData.set('comment', comment);
        reviewData.set('rating', rating);
        dispatch(newReview(reviewData));
        setOpen(false);
        setProgress(progress + 80);
    };

    const openLightbox = index => {
        setLightboxImageIndex(index);
        setLightboxIsOpen(true);
    };

    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(() => {
            if (isMounted) setProgress(0);
        }, 5000);

        setProgress(100);

        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (reviewError) {
            toast.error(reviewError);
            dispatch(clearErrors());
        }
        if (success) {
            toast.success('Review Added Successfully');
            dispatch({ type: NEW_REVIEW_RESET });
        }
        if (isSummarized) {
            toast.success('AI Summary Generated!');
            dispatch({ type: SUMMARIZE_REVIEWS_RESET });
        }
        dispatch(getProductDetails(id));

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [dispatch, id, error, reviewError, success, isSummarized]);

    useEffect(() => {
        const socket = io("http://localhost:4000");
        socket.emit('joinProductRoom', id);

        const handleProductUpdate = (updatedProduct) => {
            toast.info("This product's details have been updated!");
            dispatch({ type: REALTIME_PRODUCT_UPDATE, payload: updatedProduct });
        };
        const handleReviewUpdate = () => {
            toast.info("A new review has been posted!");
        };
        const handleSummaryUpdate = () => {
            toast.info("An AI summary has been generated for this product!");
            dispatch(getProductDetails(id));
        };

        socket.on('productUpdate', handleProductUpdate);
        socket.on('reviewUpdate', handleReviewUpdate);
        socket.on('summaryUpdate', handleSummaryUpdate);

        return () => {
            socket.emit('leaveProductRoom', id);
            socket.off('productUpdate', handleProductUpdate);
            socket.off('reviewUpdate', handleReviewUpdate);
            socket.off('summaryUpdate', handleSummaryUpdate);
            socket.disconnect();
        };
    }, [dispatch, id]);

    const inStock = product?.Stock >= 1;

    return (
        <Fragment>
            {loading || !product?._id ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title={`${product?.name} · Maison`} />

                    <div className='editorial-shell py-14'>
                        <div className='grid gap-12 lg:grid-cols-2 lg:gap-16'>
                            {/* Gallery */}
                            <div className='lg:sticky lg:top-28 lg:self-start'>
                                <div className='overflow-hidden border border-line bg-surface-2'>
                                    {product.images && product.images.length > 0 && (
                                        <Carousel showThumbs={false} autoPlay infiniteLoop showStatus={false}>
                                            {product.images.map((item, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => openLightbox(i)}
                                                    className='cursor-zoom-in'
                                                >
                                                    <img
                                                        className='aspect-square w-full object-cover'
                                                        src={item.url}
                                                        alt={`${i} Slide`}
                                                    />
                                                </div>
                                            ))}
                                        </Carousel>
                                    )}
                                </div>
                                <p className='mt-3 text-center font-sans text-[0.7rem] uppercase tracking-luxe text-ink-faint'>
                                    Tap image to zoom
                                </p>
                            </div>

                            <Lightbox
                                open={lightboxIsOpen}
                                close={() => setLightboxIsOpen(false)}
                                slides={product.images?.map(item => ({ src: item.url })) || []}
                                index={lightboxImageIndex}
                            />

                            {/* Details */}
                            <div className='flex flex-col'>
                                <p className='eyebrow'>Maison Collection</p>
                                <h1 className='heading-display mt-3 text-4xl sm:text-5xl'>{product.name}</h1>
                                <p className='mt-2 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint'>
                                    Ref. {product._id}
                                </p>

                                <div className='mt-5 flex items-center gap-3'>
                                    <Rating name='product-rating' {...options} />
                                    <span className='font-sans text-sm text-ink-faint'>
                                        {product.numOfReviews} Reviews
                                    </span>
                                </div>

                                <p className='mt-6 font-display text-4xl font-medium text-ink'>{`₹${product.price}`}</p>

                                <div className='mt-3 flex items-center gap-2'>
                                    <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-success' : 'bg-danger'}`} />
                                    <span className={`font-sans text-[0.72rem] uppercase tracking-luxe ${inStock ? 'text-success' : 'text-danger'}`}>
                                        {inStock ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>

                                <div className='mt-8 rule-luxe' />

                                {/* Quantity + actions */}
                                <div className='mt-8 flex flex-col gap-4'>
                                    <div className='flex items-center gap-4'>
                                        <label className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft'>
                                            Quantity
                                        </label>
                                        <select
                                            value={quantity}
                                            onChange={e => setQuantity(Number(e.target.value))}
                                            disabled={!inStock}
                                            className='border border-line bg-transparent px-4 py-2 font-sans text-sm text-ink focus:border-brass focus:outline-none disabled:opacity-50'
                                        >
                                            {[...Array(Math.min(10, product.Stock || 1)).keys()].map(x => (
                                                <option key={x + 1} value={x + 1}>{x + 1}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className='flex flex-col gap-3 sm:flex-row'>
                                        <button
                                            disabled={!inStock}
                                            onClick={addToCartHandler}
                                            className='btn-solid flex-1'
                                        >
                                            Add to Cart
                                        </button>
                                        <button onClick={wishlistHandler} className='btn-outline flex-1'>
                                            Add to Wishlist
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className='mt-10'>
                                    <p className='eyebrow'>Description</p>
                                    <p className='mt-4 font-sans text-[0.95rem] leading-relaxed text-ink-soft'>
                                        {product.description}
                                    </p>
                                </div>

                                <button
                                    onClick={submitReviewToggle}
                                    className='mt-10 self-start font-sans text-[0.72rem] uppercase tracking-luxe text-brass underline-offset-4 hover:underline'
                                >
                                    Write a Review
                                </button>
                            </div>
                        </div>

                        {/* Reviews */}
                        <div className='mt-24'>
                            <div className='mb-10 flex flex-wrap items-end justify-between gap-4'>
                                <div>
                                    <p className='eyebrow'>What Buyers Say</p>
                                    <h2 className='heading-display mt-3 text-display'>Reviews</h2>
                                </div>
                                {user && user.role === 'admin' && product.reviews && product.reviews.length > 2 && (
                                    <Button
                                        variant='contained'
                                        onClick={generateSummaryHandler}
                                        disabled={summaryLoading}
                                        startIcon={<AutoAwesomeIcon />}
                                        sx={{
                                            backgroundColor: '#A07C4B',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.14em',
                                            fontSize: '0.72rem',
                                            '&:hover': { backgroundColor: '#8a6a3f' },
                                        }}
                                    >
                                        {summaryLoading ? 'Generating…' : 'Generate AI Summary'}
                                    </Button>
                                )}
                            </div>

                            {product.reviews && product.reviews.length > 0 && product.aiSummary && (
                                <div className='mb-10 border border-brass/40 bg-surface p-8'>
                                    <p className='eyebrow flex items-center gap-2'>
                                        <AutoAwesomeIcon fontSize='inherit' /> AI-Powered Summary
                                    </p>
                                    <div className='mt-4 whitespace-pre-wrap font-sans text-[0.95rem] leading-relaxed text-ink-soft'>
                                        {product.aiSummary}
                                    </div>
                                </div>
                            )}

                            {product.reviews && product.reviews.length > 0 ? (
                                <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                                    {product.reviews.map(review => (
                                        <ReviewCard key={review._id} review={review} />
                                    ))}
                                </div>
                            ) : (
                                <p className='font-display text-2xl italic text-ink-faint'>No reviews yet — be the first.</p>
                            )}
                        </div>
                    </div>

                    <Dialog aria-labelledby='review-dialog' open={open} onClose={submitReviewToggle}>
                        <DialogTitle sx={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem' }}>
                            Submit Review
                        </DialogTitle>
                        <DialogContent className='flex flex-col gap-4' sx={{ minWidth: 320 }}>
                            <Rating
                                onChange={e => setRating(e.target.value)}
                                value={Number(rating)}
                                size='large'
                            />
                            <textarea
                                cols='30'
                                rows='5'
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder='Share your thoughts…'
                                className='field-luxe resize-none border border-line p-3'
                            ></textarea>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={submitReviewToggle} sx={{ color: '#8A8278' }}>Cancel</Button>
                            <Button onClick={reviewSubmitHandler} sx={{ color: '#A07C4B' }}>Submit</Button>
                        </DialogActions>
                    </Dialog>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ProductDetails;

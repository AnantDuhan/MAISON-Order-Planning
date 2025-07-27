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

import './ProductDetails.css';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

import io from 'socket.io-client';

const ProductDetails = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    const { product, loading, error } = useSelector(
        state => state.productDetails
    );

    const { user } = useSelector(state => state.user);

    const { wishlist } = useSelector(state => state.wishlist);

    const { success, error: reviewError } = useSelector(
        state => state.newReview
    );

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
    
    // State for the new lightbox
    const [lightboxIsOpen, setLightboxIsOpen] = useState(false);
    const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const options = {
        size: 'large',
        value: product?.ratings,
        readOnly: true, // Should be true for display
        precision: 0.5
    };

    const increaseQuantity = () => {
        if (product.Stock <= quantity) return;
        const qty = quantity + 1;
        setQuantity(qty);
    };

    const decreaseQuantity = () => {
        if (1 >= quantity) return;
        const qty = quantity - 1;
        setQuantity(qty);
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
        const isProductInWishlist = wishlist.some(item => item.product === id);

        if (isProductInWishlist) {
            toast.info('Product is already in the wishlist');
        } else {
            dispatch(addProductToWishlist(id));
            toast.success('Item Added To Wishlist');
        }
        setProgress(progress + 80);
    }

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
        }
    }, [dispatch, id, error, reviewError, success, isSummarized]);

    useEffect(() => {
        const socket = io("http://localhost:4000");

        socket.emit('joinProductRoom', id);

        const handleProductUpdate = (updatedProduct) => {
            console.log("Product update received:", updatedProduct);
            toast.info("This product's details have been updated in real-time!");
            dispatch({ 
                type: REALTIME_PRODUCT_UPDATE,
                payload: updatedProduct 
            });
        };

        const handleReviewUpdate = (reviewData) => {
            console.log("Review update received:", reviewData);
            toast.info("A new review has been posted!");
        };

        const handleSummaryUpdate = (summary) => {
            console.log("Summary update received:", summary);
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

    return (
        <Fragment>
            {loading ? (
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <Fragment>
                    <MetaData title={`${product.name} -- ECOMMERCE`} />
                    <div className='ProductDetails'>
                        <div>
                            {product.images && product.images.length > 0 && (
                                <Carousel showThumbs={false} autoPlay infiniteLoop>
                                    {product.images.map((item, i) => (
                                        <div
                                            key={i}
                                            onClick={() => openLightbox(i)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <img
                                                className='CarouselImage'
                                                src={item.url}
                                                alt={`${i} Slide`}
                                            />
                                        </div>
                                    ))}
                                </Carousel>
                            )}
                        </div>

                        {/* 3. The new Lightbox component implementation */}
                        <Lightbox
                            open={lightboxIsOpen}
                            close={() => setLightboxIsOpen(false)}
                            slides={product.images?.map(item => ({ src: item.url })) || []}
                            index={lightboxImageIndex}
                        />

                        <div>
                            <div className='detailsBlock-1'>
                                <h2>{product.name}</h2>
                                <p>Product # {product._id}</p>
                            </div>
                            <div className='detailsBlock-2'>
                                <Rating name="product-rating" {...options} />
                                <span className='detailsBlock-2-span'>
                                    {' '}
                                    ({product.numOfReviews} Reviews)
                                </span>
                            </div>
                            <div className='detailsBlock-3'>
                                <h1>{`₹${product.price}`}</h1>
                                <div className='detailsBlock-3-1'>
                                    <div className='detailsBlock-3-1-1'>
                                        <button onClick={decreaseQuantity}>-</button>
                                        <input readOnly type='number' value={quantity} />
                                        <button onClick={increaseQuantity}>+</button>
                                    </div>
                                    <button onClick={wishlistHandler} className='submitReview'>
                                        Add to Wishlist
                                    </button>
                                    <button
                                        disabled={product.Stock < 1}
                                        onClick={addToCartHandler}
                                        className='submitReview'
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                                <p>
                                    Status:{' '}
                                    <b className={product.Stock < 1 ? 'redColor' : 'greenColor'}>
                                        {product.Stock < 1 ? 'Out Of Stock' : 'In Stock'}
                                    </b>
                                </p>
                            </div>

                            <div className='detailsBlock-4'>
                                Description : <p>{product.description}</p>
                            </div>

                            <button onClick={submitReviewToggle} className='submitReview'>
                                Submit Review
                            </button>
                        </div>
                    </div>

                    <h3 className='reviewsHeading'>REVIEWS</h3>

                    {user && user.role === 'admin' && product.reviews && product.reviews.length > 2 && (
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={generateSummaryHandler}
                            disabled={summaryLoading}
                            startIcon={<AutoAwesomeIcon />}
                        >
                            {summaryLoading ? 'Generating...' : 'Generate AI Summary'}
                        </Button>
                    )}

                    <div className="ai-summary-card">
                        <div className="ai-summary-card-inner">
                            <h3>🤖 AI-Powered Summary</h3>
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Roboto, sans-serif' }}>
                                {product.aiSummary}
                            </div>
                        </div>
                    </div>

                    <Dialog
                        aria-labelledby='simple-dialog-title'
                        open={open}
                        onClose={submitReviewToggle}
                    >
                        <DialogTitle>Submit Review</DialogTitle>
                        <DialogContent className='submitDialog'>
                            <Rating
                                onChange={(e) => setRating(e.target.value)}
                                value={Number(rating)}
                                size='large'
                            />
                            <textarea
                                className='submitDialogTextArea'
                                cols='30'
                                rows='5'
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                            ></textarea>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={submitReviewToggle} color='secondary'>Cancel</Button>
                            <Button onClick={reviewSubmitHandler} color='primary'>Submit</Button>
                        </DialogActions>
                    </Dialog>

                    {product.reviews && product.reviews.length > 0 ? (
                        <div className='reviews'>
                            {product.reviews.map(review => (
                                <ReviewCard key={review._id} review={review} />
                            ))}
                        </div>
                    ) : (
                        <p className='noReviews'>No Reviews Yet</p>
                    )}
                </Fragment>
            )}
        </Fragment>
    );
};

export default ProductDetails;
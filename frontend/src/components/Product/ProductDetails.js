import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core';
import { Rating } from '@material-ui/lab';
import React, { Fragment, useEffect, useState } from 'react';
import Lightbox from 'react-images';
import { useDispatch, useSelector } from 'react-redux';
import { Carousel } from 'react-responsive-carousel';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import { addItemsToCart } from '../../actions/cartAction';
import { addProductToWishlist, clearErrors, getProductDetails, newReview } from '../../actions/productAction';
import { NEW_REVIEW_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import ReviewCard from './ReviewCard';

import './ProductDetails.css';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

const ProductDetails = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    const { product, loading, error } = useSelector(
        state => state.productDetails
    );

    const { wishlist } = useSelector(state => state.wishlist);

    const { success, error: reviewError } = useSelector(
        state => state.newReview
    );

    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const options = {
        size: 'large',
        value: product?.ratings,
        readOnly: false,
        precision: 0.5
    };

    const [quantity, setQuantity] = useState(1);
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [lightboxIsOpen, setLightboxIsOpen] = useState(false);
    const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

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
        dispatch(getProductDetails(id));
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, id, error, reviewError, success]);

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
                                <Carousel showThumbs={false}>
                                    {product.images.map((item, i) => (
                                        <div
                                            key={i}
                                            onClick={() => openLightbox(i)}
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

                        {lightboxIsOpen && (
                            <Lightbox
                                images={product.images.map(item => ({
                                    src: item.url
                                }))}
                                isOpen={lightboxIsOpen}
                                onClose={() => setLightboxIsOpen(false)}
                                currentImage={lightboxImageIndex}
                                onClickPrev={() =>
                                    setLightboxImageIndex(prev =>
                                        prev === 0
                                            ? product.images.length - 1
                                            : prev - 1
                                    )
                                }
                                onClickNext={() =>
                                    setLightboxImageIndex(prev =>
                                        prev === product.images.length - 1
                                            ? 0
                                            : prev + 1
                                    )
                                }
                            />
                        )}

                        <div>
                            <div className='detailsBlock-1'>
                                <h2>{product.name}</h2>
                                <p>Product # {product._id}</p>
                            </div>
                            <div className='detailsBlock-2'>
                                <Rating name={`rating`} {...options} />
                                <span className='detailsBlock-2-span'>
                                    {' '}
                                    ({product.numOfReviews} Reviews)
                                </span>
                            </div>
                            <div className='detailsBlock-3'>
                                <h1>{`₹${product.price}`}</h1>
                                <div className='detailsBlock-3-1'>
                                    <div className='detailsBlock-3-1-1'>
                                        <button onClick={decreaseQuantity}>
                                            -
                                        </button>
                                        <input
                                            readOnly
                                            type='number'
                                            value={quantity}
                                        />
                                        <button onClick={increaseQuantity}>
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={wishlistHandler}
                                        className='submitReview'
                                    >
                                        Add to Wishlist
                                    </button>
                                    <button
                                        disabled={
                                            product.Stock < 1 ? true : false
                                        }
                                        onClick={addToCartHandler}
                                        className='submitReview'
                                    >
                                        Add to Cart
                                    </button>
                                </div>

                                <p>
                                    Status:{' '}
                                    <b
                                        className={
                                            product.Stock < 1
                                                ? 'redColor'
                                                : 'greenColor'
                                        }
                                    >
                                        {product.Stock < 1
                                            ? 'Out Of Stock'
                                            : 'In Stock'}
                                    </b>
                                </p>
                            </div>

                            <div className='detailsBlock-4'>
                                Description : <p>{product.description}</p>
                            </div>

                            <button
                                onClick={submitReviewToggle}
                                className='submitReview'
                            >
                                Submit Review
                            </button>
                        </div>
                    </div>

                    <h3 className='reviewsHeading'>REVIEWS</h3>

                    <Dialog
                        aria-labelledby='simple-dialog-title'
                        open={open}
                        onClose={submitReviewToggle}
                    >
                        <DialogTitle>Submit Review</DialogTitle>
                        <DialogContent className='submitDialog'>
                            <Rating
                                onChange={e => setRating(e.target.value)}
                                value={rating}
                                size='large'
                                precision='0.5'
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
                            <Button
                                onClick={submitReviewToggle}
                                color='secondary'
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={reviewSubmitHandler}
                                color='primary'
                            >
                                Submit
                            </Button>
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

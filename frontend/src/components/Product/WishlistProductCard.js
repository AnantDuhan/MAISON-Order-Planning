import { Rating } from '@mui/material';
import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { removeProductFromWishlist } from '../../actions/productAction';

const WishlistProductCard = ({ product }) => {

    const dispatch = useDispatch();

    const options = {
        size: 'small',
        value: product.ratings,
        readOnly: false,
        precision: 0.2
    };

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = product.images;

     const deleteWishlistProduct = () => {
         toast.success('Product Removed from wishlist');
         dispatch(removeProductFromWishlist(product._id));
     };

    useEffect(() => {
        const intervalId = setInterval(() => {
            const nextIndex = (currentImageIndex + 1) % images.length;
            setCurrentImageIndex(nextIndex);
        }, 2000);

        return () => clearInterval(intervalId);
    }, [currentImageIndex, images.length]);

    return (
        <Fragment>
            <Link className='productCard' to={`/product/${product._id}`}>
                <div className='image-container'>
                    <img
                        src={images[currentImageIndex].url}
                        alt={product.name}
                        className='product-image'
                    />
                </div>
                <p>{product.name}</p>
                <div>
                    <Rating {...options} />
                    <span className='productCardSpan'>
                        ({product.numOfReviews} Reviews)
                    </span>
                </div>
                <span>{`₹${product.price}`}</span>
                <button onClick={deleteWishlistProduct} className='deleteButton'>
                    Remove from Wishlist
                </button>
            </Link>
        </Fragment>
    );
};

export default WishlistProductCard;

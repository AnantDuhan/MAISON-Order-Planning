import React, { useState } from 'react';
import './ProductGridItem.css';
import { Rating } from '@mui/material';
import { Link } from 'react-router-dom';

const ProductGridItem = ({ product }) => {
    const [hovered, setHovered] = useState(false);

    const handleMouseEnter = () => {
        setHovered(true);
    };

    const handleMouseLeave = () => {
        setHovered(false);
    };

    const options = {
        size: 'large',
        value: product.ratings,
        readOnly: false,
        precision: 0.5
    };

    if (!product) {
        return null;
    }

    const defaultImageUrl = "https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg";

    const imageUrl = product.images && product.images.length > 0 
        ? product.images[0]?.url 
        : defaultImageUrl;

    

    return (
        <Link to={`/product/${product._id}`}>
            <div
                className='productGridItem'
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <img src={imageUrl} alt={product.name} />

                {hovered && (
                    <div className='productGridItemContent'>
                        <p>{product.name}</p>
                        <span>{`${product.description}`}</span>
                        <span>{`₹${product.price}`}</span>
                        <Rating {...options} />
                        <span className='productCardSpan'>
                            ({product.numOfReviews} Reviews)
                        </span>
                    </div>
                )}
            </div>
        </Link>
    );
};

export default ProductGridItem;

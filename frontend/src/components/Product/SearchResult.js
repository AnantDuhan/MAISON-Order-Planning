import { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import { Typography, Slider } from '@mui/material';

import { clearErrors, searchProducts } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';

import './Products.css';

const SearchResult = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const keyword = searchParams.get('keyword') || "";

    const [category, setCategory] = useState("");
    const [price, setPrice] = useState([0, 100000]);
    const [ratings, setRatings] = useState(0);

    const { loading, error, products, facets } = useSelector(
        (state) => state.searchResults
    );

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(searchProducts(keyword, category, price, ratings));
    }, [dispatch, keyword, category, price, ratings, error]);

    const categories = facets?.categories?.buckets || [];

    const priceHandler = (event, newPrice) => {
        setPrice(newPrice);
    };

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='red' progress={100} />
            ) : (
                <Fragment>
                    <MetaData title={`Search Results for "${keyword}"`} />
                    <h2 className='productsHeading'>Search Results</h2>
                    
                    <div className="search-page-container">
                        {/* Filter Sidebar */}
                        <div className="filterBox">
                            <Typography>Categories</Typography>
                            <ul className="categoryBox">
                                {categories.map((cat) => (
                                    <li
                                        className="category-link"
                                        key={cat.key}
                                        onClick={() => setCategory(cat.key)}
                                    >
                                        {cat.key} ({cat.doc_count})
                                    </li>
                                ))}
                            </ul>

                            <fieldset className="filter-group">
                                <Typography component="legend">Price</Typography>
                                <Slider
                                    value={price}
                                    onChange={priceHandler}
                                    valueLabelDisplay="auto"
                                    aria-labelledby="range-slider"
                                    min={0}
                                    max={100000}
                                />
                            </fieldset>

                            <fieldset className="filter-group">
                                <Typography component="legend">Ratings Above</Typography>
                                <Slider
                                    value={ratings}
                                    onChange={(e, newRating) => {
                                        setRatings(newRating);
                                    }}
                                    aria-labelledby="continuous-slider"
                                    valueLabelDisplay="auto"
                                    min={0}
                                    max={5}
                                />
                            </fieldset>
                        </div>

                        <div className='products'>
                            {products && products.length > 0 ? (
                                products.map((product) => (
                                    <ProductCard
                                        key={product._id}
                                        product={product}
                                    />
                                ))
                            ) : (
                                <p className='no-products-found'>
                                    No products found for your search.
                                </p>
                            )}
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default SearchResult;

import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import React, { Fragment, useEffect, useState } from 'react';
import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';
// 1. Import useLocation to check the URL
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, getProduct } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';

import './Products.css';

const SearchResult = () => {
    const dispatch = useDispatch();
    const location = useLocation(); // Get location object

    // 2. Check if we are on the search results page
    const isSearchPage = location.pathname === '/products/search';

    const [currentPage, setCurrentPage] = useState(1);
    const [price, setPrice] = useState([0, 40000]);
    const [category, setCategory] = useState('');
    const [ratings, setRatings] = useState(0);
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const { keyword } = useParams();

    // --- Data from Redux Store ---
    // 3. Get data from BOTH state slices (for normal Browse and for search)
    const {
        products,
        loading,
        error,
        productsCount,
        resultPerPage,
        filteredProductsCount
    } = useSelector((state) => state.products);

    const { products: searchResults, loading: searchLoading } = useSelector(
        (state) => state.productsSearch
    );

    // 4. Decide which products and loading state to use based on the page
    const productsToDisplay = isSearchPage ? searchResults : products;
    const isLoading = isSearchPage ? searchLoading : loading;

    const setCurrentPageNo = (e) => {
        setCurrentPage(e);
    };

    const getUniqueCategories = (products) => {
        if (!products) return [];
        const categoriesSet = new Set();
        products.forEach((product) => {
            categoriesSet.add(product.category);
        });
        return Array.from(categoriesSet);
    };

    const priceHandler = (event, newPrice) => {
        // ... (price handler logic remains the same)
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);

        // 5. Only fetch general products if we are NOT on the search page
        if (!isSearchPage) {
            dispatch(getProduct(keyword, currentPage, price, category, ratings));
        }
    }, [
        dispatch,
        keyword,
        currentPage,
        price,
        category,
        ratings,
        error,
        isSearchPage
    ]);

    let count = filteredProductsCount;

    return (
        <Fragment>
            {isLoading ? ( // 6. Use the combined loading state
                <LoadingBar
                    color='red'
                    progress={progress}
                    onLoaderFinished={onLoaderFinished}
                />
            ) : (
                <Fragment>
                    <MetaData title='PRODUCTS -- ECOMMERCE' />
                    <h2 className='productsHeading'>
                        {isSearchPage ? 'Search Results' : 'All Products'}
                    </h2>
                    <div className='products'>
                        {/* 7. Render the correct set of products */}
                        {productsToDisplay && productsToDisplay.length > 0 ? (
                            productsToDisplay.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                />
                            ))
                        ) : (
                            <p className='no-products-found'>
                                {isSearchPage
                                    ? 'No products found for your search.'
                                    : 'No products available.'}
                            </p>
                        )}
                    </div>
                    
                    {!isSearchPage && (
                        <Fragment>
                            {resultPerPage < count && (
                                <div className='paginationBox'>
                                    {resultPerPage < count && (
                                            <Pagination
                                                activePage={currentPage}
                                                itemsCountPerPage={resultPerPage}
                                                totalItemsCount={productsCount}
                                                onChange={setCurrentPageNo}
                                                nextPageText='Next'
                                                prevPageText='Prev'
                                                firstPageText='1st'
                                                lastPageText='Last'
                                                itemClass='page-item'
                                                linkClass='page-link'
                                                activeClass='pageItemActive'
                                                activeLinkClass='pageLinkActive'
                                                hideFirstLastPages={true}
                                                hidePrevNextPages={true}
                                            />
                                    )}
                                </div>
                            )}
                        </Fragment>
                    )}
                </Fragment>
            )}
        </Fragment>
    );
};

export default SearchResult;
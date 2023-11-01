import Slider from '@material-ui/core/Slider';
import Typography from '@material-ui/core/Typography';
import React, { Fragment, useEffect, useState } from 'react';
import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// import Loader from '../layout/Loader/Loader';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, getProduct } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';

import './Products.css';

const Products = () => {
    const dispatch = useDispatch();

    const [currentPage, setCurrentPage] = useState(1);
    const [price, setPrice] = useState([0, 40000]);
    const [category, setCategory] = useState("");
    const [ratings, setRatings] = useState(0);
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const { keyword } = useParams();
    const { products, loading, error, productsCount, resultPerPage, filteredProductsCount } =
        useSelector((state) => state.products);

    const setCurrentPageNo = (e) => {
        setCurrentPage(e);
    };

    const getUniqueCategories = products => {
        const categoriesSet = new Set();
        products.forEach(product => {
            categoriesSet.add(product.category);
        });
        return Array.from(categoriesSet);
    };

    const priceRanges = [
        [
            { key: 'range1', label: '0 - 1000', value: [0, 1000] },
            { key: 'range2', label: '1000 - 2500', value: [1000, 2500] }
        ],
        [
            { key: 'range3', label: '2500 - 5000', value: [2500, 5000] },
            { key: 'range4', label: '5000+', value: [5000, 400000] } // Adjust the upper limit
        ]
    ];

    const priceHandler = (event, newPrice) => {
        if (price[0] === newPrice[0] && price[1] === newPrice[1]) {
            // If the clicked range is already selected, deselect it
            setPrice([0, 400000]); // You can adjust the initial state as needed
        } else {
            setPrice(newPrice);
        }
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(getProduct(keyword, currentPage, price, category, ratings));
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
    }, [dispatch, keyword, currentPage, price, category, ratings, error]);

    let count = filteredProductsCount;

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
                    <MetaData title='PRODUCTS -- ECOMMERCE' />
                    <h2 className='productsHeading'>Products</h2>
                    <div className='products'>
                        {products &&
                            products.map(product => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                />
                            ))}
                    </div>

                    <div className='filterBox'>
                        <Typography>Price</Typography>
                        <div className='price-ranges'>
                            {priceRanges.map((rangeLine, lineIndex) => (
                                <div
                                    key={`line_${lineIndex}`}
                                    className='price-range-line'
                                >
                                    {rangeLine.map((range, index) => (
                                        <button
                                            key={range.key}
                                            className={`price-range-button ${
                                                price[0] === range.value[0] &&
                                                price[1] === range.value[1]
                                                    ? 'active'
                                                    : ''
                                            }`}
                                            onClick={
                                                (() =>
                                                    priceHandler(
                                                        null,
                                                        range.value
                                                    ),
                                                setProgress(progress + 80))
                                            }
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <Typography>Categories</Typography>
                        <ul className='categoryBox'>
                            {getUniqueCategories(products).map(category => (
                                <li
                                    className='category-link'
                                    key={category}
                                    onClick={() => setCategory(category)}
                                >
                                    {category}
                                </li>
                            ))}
                        </ul>
                        <fieldset>
                            <Typography component='legend'>
                                Ratings Above
                            </Typography>
                            <Slider
                                value={ratings}
                                onChange={(e, newRating) => {
                                    setRatings(newRating);
                                }}
                                aria-labelledby='continuous-slider'
                                min={0}
                                max={5}
                                valueLabelDisplay='auto'
                            />
                        </fieldset>
                    </div>

                    {resultPerPage < count && (
                        <div className='paginationBox'>
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
                        </div>
                    )}
                </Fragment>
            )}
        </Fragment>
    );
};

export default Products;

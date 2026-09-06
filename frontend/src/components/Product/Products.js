import Slider from '@mui/material/Slider';
import React, { Fragment, useEffect, useState } from 'react';
import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { clearErrors, getProduct } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';

const Products = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [price, setPrice] = useState([0, 400000]);
    const [category, setCategory] = useState("");
    const [ratings, setRatings] = useState(0);
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const { keyword } = useParams();
    const { products, loading, error, productsCount, resultPerPage, filteredProductsCount } =
        useSelector((state) => state.products);

    const setCurrentPageNo = e => setCurrentPage(e);

    const getUniqueCategories = products => {
        const categoriesSet = new Set();
        products.forEach(product => categoriesSet.add(product.category));
        return Array.from(categoriesSet);
    };

    const priceRanges = [
        { key: 'range1', label: '0 – 1000', value: [0, 1000] },
        { key: 'range2', label: '1000 – 2500', value: [1000, 2500] },
        { key: 'range3', label: '2500 – 5000', value: [2500, 5000] },
        { key: 'range4', label: '5000+', value: [5000, 400000] },
    ];

    const priceHandler = newPrice => {
        if (price[0] === newPrice[0] && price[1] === newPrice[1]) {
            setPrice([0, 400000]);
        } else {
            setPrice(newPrice);
        }
    };

    useEffect(() => {
        setProgress(100);
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        const timer = setTimeout(() => setProgress(0), 5000);
        dispatch(getProduct(keyword, currentPage, price, category, ratings));
        return () => clearTimeout(timer);
    }, [dispatch, navigate, keyword, currentPage, price, category, ratings, error]);

    let count = filteredProductsCount;

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Shop · Maison' />

                    <div className='editorial-shell py-14'>
                        {/* Page header */}
                        <div className='mb-12 text-center'>
                            <p className='eyebrow'>The Collection</p>
                            <h1 className='heading-display mt-3 text-display'>Shop All</h1>
                        </div>

                        <div className='grid gap-12 lg:grid-cols-[240px_1fr]'>
                            {/* Filters */}
                            <aside className='lg:sticky lg:top-28 lg:self-start'>
                                <div className='space-y-10'>
                                    <div>
                                        <h3 className='eyebrow'>Price</h3>
                                        <div className='mt-5 flex flex-col gap-2'>
                                            {priceRanges.map(range => {
                                                const active = price[0] === range.value[0] && price[1] === range.value[1];
                                                return (
                                                    <button
                                                        key={range.key}
                                                        onClick={() => priceHandler(range.value)}
                                                        className={`flex items-center justify-between border-b border-line py-2 text-left font-sans text-sm transition-colors ${
                                                            active ? 'text-brass' : 'text-ink-soft hover:text-ink'
                                                        }`}
                                                    >
                                                        <span>₹{range.label}</span>
                                                        {active && <span className='text-brass'>—</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className='eyebrow'>Categories</h3>
                                        <ul className='mt-5 flex flex-col gap-2'>
                                            {getUniqueCategories(products).map(cat => (
                                                <li
                                                    key={cat}
                                                    onClick={() => setCategory(cat)}
                                                    className={`cursor-pointer font-sans text-sm capitalize transition-colors ${
                                                        category === cat ? 'text-brass' : 'text-ink-soft hover:text-ink'
                                                    }`}
                                                >
                                                    {cat}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className='eyebrow'>Ratings Above</h3>
                                        <div className='mt-4 px-1'>
                                            <Slider
                                                value={ratings}
                                                onChange={(e, newRating) => setRatings(newRating)}
                                                aria-labelledby='continuous-slider'
                                                min={0}
                                                max={5}
                                                valueLabelDisplay='auto'
                                            />
                                        </div>
                                    </div>
                                </div>
                            </aside>

                            {/* Grid */}
                            <div>
                                <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3'>
                                    {products &&
                                        products.map(product => (
                                            <ProductCard key={product._id} product={product} />
                                        ))}
                                </div>

                                {products && products.length === 0 && (
                                    <p className='py-20 text-center font-display text-2xl italic text-ink-faint'>
                                        No pieces match these filters.
                                    </p>
                                )}

                                {resultPerPage < count && (
                                    <div className='mt-16'>
                                        <Pagination
                                            activePage={currentPage}
                                            itemsCountPerPage={Number(resultPerPage)}
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
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default Products;

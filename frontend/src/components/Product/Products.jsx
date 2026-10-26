import Slider from '@mui/material/Slider';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import Loader from '../layout/Loader/Loader';

import { clearErrors, getProduct } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';
import Pager from '../layout/Pager/Pager';
import { useCategories } from '../../utils/useCategories';

const ANY_PRICE = [0, 999999];
const isAnyPrice = p => p[0] === ANY_PRICE[0] && p[1] === ANY_PRICE[1];

const Products = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [price, setPrice] = useState(ANY_PRICE);
    // The category lives in the URL (?category=electronics) so home tiles and shared links land filtered.
    const [searchParams, setSearchParams] = useSearchParams();
    const category = searchParams.get('category') || '';
    const setCategory = value => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set('category', value); else next.delete('category');
        setSearchParams(next, { replace: true });
        setCurrentPage(1);
    };
    const { categories: categoryTree } = useCategories();
    const activeDept = categoryTree.find(d => d.slug === category || d.children.some(c => c.slug === category));
    const activeName = activeDept
        ? (activeDept.slug === category ? activeDept.name : activeDept.children.find(c => c.slug === category)?.name)
        : '';
    const [ratings, setRatings] = useState(0);
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const { keyword } = useParams();
    const { products, loading, error, productsCount, resultPerPage, filteredProductsCount } =
        useSelector((state) => state.products);

    const setCurrentPageNo = e => setCurrentPage(e);

    const priceRanges = [
        { key: 'range1', label: 'Under ₹1,000', value: [0, 1000] },
        { key: 'range2', label: '₹1,000 – ₹5,000', value: [1000, 5000] },
        { key: 'range3', label: '₹5,000 – ₹25,000', value: [5000, 25000] },
        { key: 'range4', label: '₹25,000 – ₹1,00,000', value: [25000, 100000] },
        { key: 'range5', label: 'Over ₹1,00,000', value: [100000, 999999] },
    ];

    const priceHandler = newPrice => {
        if (price[0] === newPrice[0] && price[1] === newPrice[1]) {
            setPrice(ANY_PRICE);
        } else {
            setPrice(newPrice);
        }
        setCurrentPage(1);
    };

    const catButton = (slug, label, count, nested) => {
        const active = category === slug;
        return (
            <li key={slug || 'all'}>
                <button
                    type='button'
                    onClick={() => setCategory(slug)}
                    aria-pressed={active}
                    className={`flex w-full items-baseline justify-between gap-3 py-1.5 text-left font-sans text-sm transition-colors ${nested ? 'pl-4' : ''} ${active ? 'text-brass' : 'text-ink-soft hover:text-ink'}`}
                >
                    <span>{label}</span>
                    {count != null && <span className='text-xs text-ink-faint'>{count}</span>}
                </button>
            </li>
        );
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

    // Pages are counted from the FILTERED total, not the whole catalogue.
    let count = filteredProductsCount;

    return (
        <Fragment>
            {loading ? (
                <Fragment>
                    <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
                    <Loader label='Gathering the collection' />
                </Fragment>
            ) : (
                <Fragment>
                    <MetaData title='Shop · Maison' />

                    <div className='editorial-shell py-14'>
                        {/* Page header */}
                        <div className='mb-12 text-center'>
                            <p className='eyebrow'>{activeDept && activeName !== activeDept.name ? activeDept.name : 'The Collection'}</p>
                            <h1 className='heading-display mt-3 text-display'>{activeName || 'Shop All'}</h1>
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
                                                        <span>{range.label}</span>
                                                        {active && <span className='text-brass'>—</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className='eyebrow'>Categories</h3>
                                        <ul className='mt-5 flex flex-col'>
                                            {catButton('', 'All', null, false)}
                                            {categoryTree.map(dept => (
                                                <Fragment key={dept._id}>
                                                    {catButton(dept.slug, dept.name, dept.productCount, false)}
                                                    {dept.children.filter(c => c.productCount > 0).map(c => catButton(c.slug, c.name, c.productCount, true))}
                                                </Fragment>
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
                                    <div className='py-20 text-center'>
                                        <p className='font-display text-2xl italic text-ink-faint'>
                                            {activeName && isAnyPrice(price) ? `Nothing in ${activeName} just yet.` : 'No pieces match these filters.'}
                                        </p>
                                        {(category || !isAnyPrice(price)) && (
                                            <button type='button' onClick={() => { setCategory(''); setPrice(ANY_PRICE); }} className='btn-outline mt-6'>
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                )}

                                {resultPerPage < count && (
                                    <div className='mt-16'>
                                        <Pager
                                            currentPage={currentPage}
                                            perPage={Number(resultPerPage)}
                                            totalItems={count}
                                            onChange={setCurrentPageNo}
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

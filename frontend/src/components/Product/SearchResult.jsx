import { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';
import { Slider } from '@mui/material';

import { clearErrors, searchProducts } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';

const SearchResult = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const keyword = searchParams.get('keyword') || "";

    const [category, setCategory] = useState("");
    const [price, setPrice] = useState([0, 100000]);
    const [ratings, setRatings] = useState(0);

    const { loading, error, products, facets } = useSelector(state => state.searchResults);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(searchProducts({ keyword, category, price: { gte: price[0], lte: price[1] }, ratings }));
    }, [dispatch, keyword, category, price, ratings, error]);

    const categories = facets?.categories?.buckets || [];
    const priceHandler = (event, newPrice) => setPrice(newPrice);

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={100} />
            ) : (
                <Fragment>
                    <MetaData title={`Search · "${keyword}"`} />

                    <div className='editorial-shell py-14'>
                        <div className='mb-12 text-center'>
                            <p className='eyebrow'>Search Results</p>
                            <h1 className='heading-display mt-3 text-display'>
                                {keyword ? `“${keyword}”` : 'All Pieces'}
                            </h1>
                        </div>

                        <div className='grid gap-12 lg:grid-cols-[240px_1fr]'>
                            {/* Filters */}
                            <aside className='lg:sticky lg:top-28 lg:self-start'>
                                <div className='space-y-10'>
                                    <div>
                                        <h3 className='eyebrow'>Categories</h3>
                                        <ul className='mt-5 flex flex-col gap-2'>
                                            {categories.map(cat => (
                                                <li
                                                    key={cat.key}
                                                    onClick={() => setCategory(cat.key)}
                                                    className={`cursor-pointer font-sans text-sm capitalize transition-colors ${
                                                        category === cat.key ? 'text-brass' : 'text-ink-soft hover:text-ink'
                                                    }`}
                                                >
                                                    {cat.key} <span className='text-ink-faint'>({cat.doc_count})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h3 className='eyebrow'>Price</h3>
                                        <div className='mt-4 px-1'>
                                            <Slider
                                                value={price}
                                                onChange={priceHandler}
                                                valueLabelDisplay='auto'
                                                aria-labelledby='range-slider'
                                                min={0}
                                                max={100000}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className='eyebrow'>Ratings Above</h3>
                                        <div className='mt-4 px-1'>
                                            <Slider
                                                value={ratings}
                                                onChange={(e, newRating) => setRatings(newRating)}
                                                aria-labelledby='continuous-slider'
                                                valueLabelDisplay='auto'
                                                min={0}
                                                max={5}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </aside>

                            {/* Grid */}
                            <div>
                                {products && products.length > 0 ? (
                                    <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3'>
                                        {products.map(product => (
                                            <ProductCard key={product._id} product={product} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className='py-20 text-center font-display text-2xl italic text-ink-faint'>
                                        No products found for your search.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default SearchResult;

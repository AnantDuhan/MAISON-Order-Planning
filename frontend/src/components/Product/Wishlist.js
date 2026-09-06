import React, { Fragment, useEffect, useState } from 'react';
import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, fetchWishlist } from '../../actions/productAction';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';
import WishlistProductCard from './WishlistProductCard';

const Wishlist = () => {
    const dispatch = useDispatch();
    const [currentPage, setCurrentPage] = useState(1);

    const { loading, error, productsCount, resultPerPage, filteredProductsCount } =
        useSelector(state => state.products);
    const { wishlist } = useSelector(state => state.wishlist);

    const setCurrentPageNo = e => setCurrentPage(e);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        dispatch(fetchWishlist());
    }, [dispatch, error]);

    let count = filteredProductsCount;

    return (
        <Fragment>
            {loading ? (
                <Loader />
            ) : (
                <Fragment>
                    <MetaData title='Wishlist · Maison' />
                    <div className='editorial-shell py-14'>
                        <div className='mb-12 text-center'>
                            <p className='eyebrow'>Saved for Later</p>
                            <h1 className='heading-display mt-3 text-display'>Wishlist</h1>
                        </div>

                        {wishlist && wishlist.length > 0 ? (
                            <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                                {wishlist.map(product => (
                                    <WishlistProductCard key={product._id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className='flex flex-col items-center py-24 text-center'>
                                <p className='font-display text-2xl italic text-ink-faint'>
                                    Your wishlist is empty.
                                </p>
                                <Link to='/products' className='btn-outline mt-8'>Browse the Collection</Link>
                            </div>
                        )}

                        {resultPerPage < count && (
                            <div className='mt-16'>
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
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default Wishlist;

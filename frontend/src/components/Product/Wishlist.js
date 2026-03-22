import React, { Fragment, useEffect, useState } from 'react';
import Pagination from 'react-js-pagination';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import {
    clearErrors,
    fetchWishlist,
} from '../../actions/productAction';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';

import './Wishlist.css';
import WishlistProductCard from './WishlistProductCard';

const Wishlist = () => {
    const dispatch = useDispatch();

    const [currentPage, setCurrentPage] = useState(1);

    const {
        loading,
        error,
        productsCount,
        resultPerPage,
        filteredProductsCount
    } = useSelector(state => state.products);

    const { wishlist } = useSelector(state => state.wishlist);

    const setCurrentPageNo = e => {
        setCurrentPage(e);
    };

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
                    <MetaData title='WISHLIST -- ECOMMERCE' />
                    <h2 className='productsHeading'>Wishlist</h2>
                    <div className='products'>
                        {wishlist &&
                            wishlist.map(product => (
                                <WishlistProductCard
                                    key={product._id}
                                    product={product}
                                />
                            ))}
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

export default Wishlist;

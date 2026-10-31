import axios from 'axios';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteReviews, getAllReviews } from '../../actions/productAction';
import { DELETE_REVIEW_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import Field from '../layout/Field';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import ConfirmDelete from './shared/ConfirmDelete';

const Stars = ({ value }) => (
    <span className={value >= 3 ? 'text-brass' : 'text-danger'} aria-label={`${value} out of 5`}>
        {'★'.repeat(value)}<span className='text-line'>{'★'.repeat(Math.max(0, 5 - value))}</span>
    </span>
);

/**
 * Reviews by product. Pick the product by name (most-reviewed first); the
 * choice lives in the URL (?product=id) so it survives a refresh and the
 * list reloads after every delete.
 */
const ProductReviews = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const productId = searchParams.get('product') || '';

    const { error: deleteError, isDeleted } = useSelector(state => state.review);
    const { error, reviews, loading } = useSelector(state => state.productReviews);

    // Own fetch, so the shared products list (Admin > Products) isn't touched.
    const [products, setProducts] = useState([]);
    useEffect(() => {
        let alive = true;
        axios.get('/api/v1/admin/products')
            .then(({ data }) => alive && setProducts(Array.isArray(data?.products) ? data.products : []))
            .catch(() => alive && toast.error('Could not load products'));
        return () => { alive = false; };
    }, []);

    const options = useMemo(
        () => [...products].sort((a, b) => (b.numOfReviews || 0) - (a.numOfReviews || 0) || String(a.name).localeCompare(b.name)),
        [products]
    );
    const selected = products.find(p => p._id === productId);

    useEffect(() => {
        if (productId) dispatch(getAllReviews(productId));
    }, [dispatch, productId]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (deleteError) {
            toast.error(deleteError);
            dispatch(clearErrors());
        }
        if (isDeleted) {
            toast.success('Review deleted');
            dispatch({ type: DELETE_REVIEW_RESET });
            if (productId) dispatch(getAllReviews(productId));
        }
    }, [dispatch, error, deleteError, isDeleted, productId]);

    const rows = productId
        ? (reviews || []).map(item => ({ id: item._id, user: item.name, comment: item.comment, rating: Number(item.rating) || 0 }))
        : [];

    const remove = id => dispatch(deleteReviews(id, productId));

    const columns = [
        { key: 'user', label: 'Customer', width: '1fr' },
        { key: 'comment', label: 'Review', width: '2.6fr' },
        { key: 'rating', label: 'Rating', width: '0.8fr', render: row => <Stars value={row.rating} /> },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.7fr',
            render: row => <ConfirmDelete what={`review by ${row.user}`} onConfirm={() => remove(row.id)} />,
        },
    ];

    const renderCard = row => (
        <div className='border border-line bg-surface p-4'>
            <div className='flex items-baseline justify-between gap-3'>
                <p className='font-sans text-sm text-ink'>{row.user}</p>
                <Stars value={row.rating} />
            </div>
            <p className='mt-2 font-sans text-sm leading-6 text-ink-soft'>{row.comment}</p>
            <div className='mt-3 flex justify-end'>
                <ConfirmDelete variant='button' what={`review by ${row.user}`} onConfirm={() => remove(row.id)} />
            </div>
        </div>
    );

    return (
        <Fragment>
            <MetaData title='Reviews · Admin' noIndex />
            <AdminPage title='Reviews'>
                <div className='mb-10 border border-line bg-surface p-6'>
                    <Field label='Product'>
                        <select
                            value={productId}
                            onChange={e => setSearchParams(e.target.value ? { product: e.target.value } : {})}
                        >
                            <option value=''>{products.length ? 'Choose a product…' : 'Loading products…'}</option>
                            {options.map(p => (
                                <option key={p._id} value={p._id}>
                                    {p.name} · {p.numOfReviews || 0} {p.numOfReviews === 1 ? 'review' : 'reviews'}
                                </option>
                            ))}
                        </select>
                    </Field>
                    {selected && (
                        <p className='mt-3 font-sans text-xs text-ink-faint'>
                            {selected.category} · rated {Number(selected.ratings || 0).toFixed(1)} ·{' '}
                            <Link to={`/product/${selected._id}`} className='text-brass hover:underline'>View product</Link>
                        </p>
                    )}
                </div>

                {!productId ? (
                    <p className='py-16 text-center font-display text-2xl italic text-ink-faint'>Choose a product to see its reviews.</p>
                ) : loading && !rows.length ? (
                    <p className='py-16 text-center font-sans text-sm text-ink-faint'>Loading reviews…</p>
                ) : (
                    <AdminTable
                        columns={columns}
                        rows={rows}
                        renderCard={renderCard}
                        emptyMessage='No reviews for this product yet.'
                    />
                )}
            </AdminPage>
        </Fragment>
    );
};

export default ProductReviews;

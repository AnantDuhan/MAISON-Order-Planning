import DeleteIcon from '@mui/icons-material/Delete';
import Star from '@mui/icons-material/Star';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteReviews, getAllReviews } from '../../actions/productAction';
import { DELETE_REVIEW_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';

const ProductReviews = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error: deleteError, isDeleted } = useSelector(state => state.review);
    const { error, reviews, loading } = useSelector(state => state.productReviews);

    const [productId, setProductId] = useState('');

    const deleteReviewHandler = reviewId => dispatch(deleteReviews(reviewId, productId));

    const productReviewsSubmitHandler = e => {
        e.preventDefault();
        dispatch(getAllReviews(productId));
    };

    useEffect(() => {
        if (productId.length === 24) {
            dispatch(getAllReviews(productId));
        }
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (deleteError) {
            toast.error(deleteError);
            dispatch(clearErrors());
        }
        if (isDeleted) {
            toast.success('Review Deleted Successfully');
            navigate('/admin/reviews');
            dispatch({ type: DELETE_REVIEW_RESET });
        }
    }, [dispatch, error, deleteError, navigate, isDeleted, productId]);

    const rows = (reviews || []).map(item => ({
        id: item._id,
        user: item.name,
        comment: item.comment,
        rating: item.rating,
    }));

    const columns = [
        { key: 'id', label: 'Review ID', width: '1.2fr' },
        { key: 'user', label: 'User', width: '1fr' },
        { key: 'comment', label: 'Comment', width: '2.2fr' },
        {
            key: 'rating',
            label: 'Rating',
            align: 'center',
            width: '0.6fr',
            tone: row => (row.rating >= 3 ? 'text-success' : 'text-danger'),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.6fr',
            render: row => (
                <button
                    onClick={() => deleteReviewHandler(row.id)}
                    className='text-ink-soft hover:text-danger'
                    title='Delete review'
                >
                    <DeleteIcon fontSize='small' />
                </button>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Reviews · Admin' />
            <AdminPage title='All Reviews'>
                {/* Lookup */}
                <form
                    onSubmit={productReviewsSubmitHandler}
                    className='mb-12 flex flex-col gap-4 border border-line bg-surface p-6 sm:flex-row sm:items-end'
                >
                    <div className='flex-1'>
                        <label className='eyebrow'>Product ID</label>
                        <div className='field-row mt-2'>
                            <Star />
                            <input
                                type='text'
                                placeholder='Paste a product ID'
                                required
                                value={productId}
                                onChange={e => setProductId(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        type='submit'
                        disabled={loading || productId === ''}
                        className='btn-solid shrink-0 disabled:opacity-40'
                    >
                        Search
                    </button>
                </form>

                <AdminTable
                    columns={columns}
                    rows={rows}
                    emptyMessage='No reviews found for this product.'
                />
            </AdminPage>
        </Fragment>
    );
};

export default ProductReviews;

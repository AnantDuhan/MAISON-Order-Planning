import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteProduct, getAdminProduct } from '../../actions/productAction';
import { DELETE_PRODUCT_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';

const ProductList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, products } = useSelector(state => state.products);
    const { error: deleteError, isDeleted } = useSelector(state => state.product);

    const deleteProductHandler = id => dispatch(deleteProduct(id));

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
            toast.success('Product Deleted Successfully');
            navigate('/admin/dashboard');
            dispatch({ type: DELETE_PRODUCT_RESET });
        }
        dispatch(getAdminProduct());
    }, [dispatch, error, deleteError, navigate, isDeleted]);

    const rows = (products || []).map(item => ({
        id: item._id,
        name: item.name,
        stock: item.Stock,
        price: item.price,
    }));

    const columns = [
        { key: 'id', label: 'Product ID', width: '1.4fr' },
        { key: 'name', label: 'Name', width: '2fr' },
        {
            key: 'stock',
            label: 'Stock',
            align: 'center',
            width: '0.6fr',
            tone: row => (row.stock === 0 ? 'text-danger' : 'text-ink'),
        },
        {
            key: 'price',
            label: 'Price',
            align: 'right',
            width: '0.8fr',
            render: row => `₹${row.price}`,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            width: '0.7fr',
            render: row => (
                <span className='inline-flex items-center gap-4'>
                    <Link to={`/admin/product/${row.id}`} className='text-ink-soft hover:text-brass' title='Edit'>
                        <EditIcon fontSize='small' />
                    </Link>
                    <button
                        onClick={() => deleteProductHandler(row.id)}
                        className='text-ink-soft hover:text-danger'
                        title='Delete'
                    >
                        <DeleteIcon fontSize='small' />
                    </button>
                </span>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Products · Admin' />
            <AdminPage
                title='All Products'
                action={<Link to='/admin/product' className='btn-solid'>New Product</Link>}
            >
                <AdminTable columns={columns} rows={rows} emptyMessage='No products yet.' />
            </AdminPage>
        </Fragment>
    );
};

export default ProductList;

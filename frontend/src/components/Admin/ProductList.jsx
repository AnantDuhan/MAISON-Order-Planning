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
import ConfirmDelete from './shared/ConfirmDelete';
import { priceLabel } from '../../utils/priceLabel';

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
        price: priceLabel(item),
        category: item.category,
        image: (item.images || []).find(img => img?.url)?.url || null,
    }));

    const stockText = stock => (stock > 0 ? `${stock} in stock` : 'Sold out');
    const stockTone = stock => (stock === 0 ? 'text-danger' : stock <= 3 ? 'text-brass' : 'text-ink-soft');

    // Phones and tablets: photo, name, price and stock at a glance.
    const renderCard = row => (
        <div className='flex gap-4 py-5'>
            <Link to={`/admin/product/${row.id}`} className='h-24 w-20 shrink-0 overflow-hidden bg-surface' aria-hidden='true' tabIndex={-1}>
                {row.image && <img src={row.image} alt='' loading='lazy' decoding='async' className='h-full w-full object-cover' />}
            </Link>
            <div className='min-w-0 flex-1'>
                {row.category && <p className='eyebrow truncate'>{row.category}</p>}
                <Link to={`/admin/product/${row.id}`} className='mt-1 line-clamp-2 font-sans text-sm text-ink hover:text-brass'>
                    {row.name}
                </Link>
                <p className='mt-1.5 font-sans text-sm'>
                    <span className='text-ink'>{row.price}</span>
                    <span className='mx-2 text-ink-faint'>·</span>
                    <span className={stockTone(row.stock)}>{stockText(row.stock)}</span>
                </p>
                <div className='mt-3 flex flex-wrap items-center gap-2'>
                    <Link
                        to={`/admin/product/${row.id}`}
                        className='inline-flex min-h-[40px] items-center gap-1.5 border border-line px-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink transition-colors hover:border-brass hover:text-brass'
                    >
                        <EditIcon sx={{ fontSize: 16 }} />
                        Edit
                    </Link>
                    <ConfirmDelete variant='button' what={row.name} onConfirm={() => deleteProductHandler(row.id)} />
                </div>
            </div>
        </div>
    );

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
            render: row => row.price,
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
                    <ConfirmDelete what={row.name} onConfirm={() => deleteProductHandler(row.id)} />
                </span>
            ),
        },
    ];

    return (
        <Fragment>
            <MetaData title='All Products · Admin' />
            <AdminPage
                title='All Products'
                action={<Link to='/admin/add-product' className='btn-solid'>New Product</Link>}
            >
                <AdminTable columns={columns} rows={rows} renderCard={renderCard} emptyMessage='No products yet.' />
            </AdminPage>
        </Fragment>
    );
};

export default ProductList;

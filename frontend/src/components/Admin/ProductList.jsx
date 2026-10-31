import EditIcon from '@mui/icons-material/Edit';
import React, { Fragment, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, deleteProduct, getAdminProduct } from '../../actions/productAction';
import { DELETE_PRODUCT_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import AdminTable from './shared/AdminTable';
import ConfirmDelete from './shared/ConfirmDelete';
import { priceLabel } from '../../utils/priceLabel';
import { UNLISTED_FILTER, categoryPlaces, useCategories } from '../../utils/useCategories';

const UNLISTED = UNLISTED_FILTER;

/** "Accessories › Necklaces", plus a note when the category is hidden or not in Admin > Categories. */
const CategoryCell = ({ row, compact = false }) => {
    if (!row.categoryName) return <span className='text-ink-faint'>—</span>;
    const { place } = row;
    const note = !place ? 'Not in categories' : place.hidden ? 'Hidden' : null;
    return (
        <span className={compact ? 'inline' : 'block'}>
            {place?.category ? (
                <Fragment>
                    <span className='text-ink-faint'>{place.department}</span>
                    <span className='mx-1.5 text-ink-faint'>›</span>
                    <span className='text-ink'>{place.category}</span>
                </Fragment>
            ) : (
                <span className='text-ink'>{place?.department || row.categoryName}</span>
            )}
            {note && (
                <span className={`${compact ? 'ml-2 inline' : 'mt-0.5 block'} text-xs ${place ? 'text-ink-faint' : 'text-danger'}`}>
                    {note}
                </span>
            )}
        </span>
    );
};

const ProductList = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = searchParams.get('category') || '';

    const { error, products } = useSelector(state => state.products);
    const { error: deleteError, isDeleted } = useSelector(state => state.product);
    // Hidden categories too, so every product finds its place.
    const { categories: tree } = useCategories({ admin: true });
    const places = useMemo(() => categoryPlaces(tree), [tree]);

    const deleteProductHandler = id => dispatch(deleteProduct(id));

    useEffect(() => {
        dispatch(getAdminProduct());
    }, [dispatch]);

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
            // Stay on the list (and the current filter); just reload it.
            toast.success('Product deleted');
            dispatch({ type: DELETE_PRODUCT_RESET });
            dispatch(getAdminProduct());
        }
    }, [dispatch, error, deleteError, isDeleted]);

    const allRows = useMemo(() => (products || []).map(item => {
        const categoryName = String(item.category || '').trim();
        return {
            id: item._id,
            name: item.name,
            stock: item.Stock,
            price: priceLabel(item),
            categoryName,
            place: places.get(categoryName.toLowerCase()) || null,
            image: (item.images || []).find(img => img?.url)?.url || null,
        };
    }), [products, places]);

    // Filter options: departments with their categories, each with a count.
    const counts = useMemo(() => {
        const n = new Map();
        const bump = key => n.set(key, (n.get(key) || 0) + 1);
        allRows.forEach(row => {
            if (!row.place) return bump(UNLISTED);
            bump(`d:${row.place.department}`);
            if (row.place.category) bump(`c:${row.place.category}`);
        });
        return n;
    }, [allRows]);

    const matches = row => {
        if (!filter) return true;
        if (filter === UNLISTED) return !row.place;
        if (filter.startsWith('d:')) return row.place?.department === filter.slice(2);
        if (filter.startsWith('c:')) return row.place?.category === filter.slice(2);
        return true;
    };
    const rows = allRows.filter(matches);

    const setFilter = value => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set('category', value); else next.delete('category');
        setSearchParams(next, { replace: true });
    };

    const stockText = stock => (stock > 0 ? `${stock} in stock` : 'Sold out');
    const stockTone = stock => (stock === 0 ? 'text-danger' : stock <= 3 ? 'text-brass' : 'text-ink-soft');

    const Thumb = ({ row, size }) => (
        <Link to={`/admin/product/${row.id}`} className={`${size} shrink-0 overflow-hidden border border-line bg-surface-2`} aria-hidden='true' tabIndex={-1}>
            {row.image && <img src={row.image} alt='' loading='lazy' decoding='async' className='h-full w-full object-cover' />}
        </Link>
    );

    // Phones and tablets: photo, category, name, price and stock at a glance.
    const renderCard = row => (
        <div className='flex gap-4 py-5'>
            <Thumb row={row} size='h-24 w-20' />
            <div className='min-w-0 flex-1'>
                <p className='truncate font-sans text-xs'><CategoryCell row={row} compact /></p>
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
        {
            key: 'name',
            label: 'Product',
            width: '2.4fr',
            render: row => (
                <span className='flex min-w-0 items-center gap-3'>
                    <Thumb row={row} size='h-14 w-11' />
                    <span className='min-w-0'>
                        <Link to={`/admin/product/${row.id}`} className='line-clamp-2 text-ink hover:text-brass'>{row.name}</Link>
                        <span className='mt-0.5 block font-mono text-[0.7rem] text-ink-faint'>{row.id}</span>
                    </span>
                </span>
            ),
        },
        { key: 'category', label: 'Category', width: '1.5fr', render: row => <CategoryCell row={row} /> },
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

    const selectedLabel = filter === UNLISTED
        ? 'not in any category'
        : filter ? `in ${filter.slice(2)}` : '';

    return (
        <Fragment>
            <MetaData title='All Products · Admin' noIndex />
            <AdminPage
                title='All Products'
                action={<Link to='/admin/add-product' className='btn-solid'>New Product</Link>}
            >
                {allRows.length > 0 && (
                    <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
                        <label className='flex min-w-[16rem] flex-col gap-2'>
                            <span className='eyebrow'>Category</span>
                            <select
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className='border-0 border-b border-line bg-transparent py-2 pr-8 font-sans text-sm text-ink focus:border-ink focus:outline-none focus:ring-0'
                            >
                                <option value=''>All categories · {allRows.length}</option>
                                {tree.map(d => (
                                    <optgroup key={d._id} label={d.name}>
                                        <option value={`d:${d.name}`}>All {d.name} · {counts.get(`d:${d.name}`) || 0}</option>
                                        {(d.children || []).map(c => (
                                            <option key={c._id} value={`c:${c.name}`}>{c.name} · {counts.get(`c:${c.name}`) || 0}</option>
                                        ))}
                                    </optgroup>
                                ))}
                                {counts.get(UNLISTED) > 0 && (
                                    <option value={UNLISTED}>Not in any category · {counts.get(UNLISTED)}</option>
                                )}
                            </select>
                        </label>
                        <p className='font-sans text-sm text-ink-faint'>
                            {rows.length} {rows.length === 1 ? 'product' : 'products'} {selectedLabel}
                            {filter && (
                                <button type='button' onClick={() => setFilter('')} className='ml-3 text-brass hover:underline'>Clear</button>
                            )}
                        </p>
                    </div>
                )}
                <AdminTable
                    key={filter}
                    columns={columns}
                    rows={rows}
                    renderCard={renderCard}
                    emptyMessage={filter ? 'No products in this category.' : 'No products yet.'}
                />
            </AdminPage>
        </Fragment>
    );
};

export default ProductList;

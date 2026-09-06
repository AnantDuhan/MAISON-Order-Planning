import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import StorageIcon from '@mui/icons-material/Storage';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, getProductDetails, updateProduct } from '../../actions/productAction';
import { UPDATE_PRODUCT_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';

const categories = [
    'Laptop', 'Footwear', 'Bottom', 'Tops', 'Attire',
    'Camera', 'SmartPhones', 'Jeans',
];

const UpdateProduct = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    const { error, product } = useSelector(state => state.productDetails);
    const { loading, error: updateError, isUpdated } = useSelector(state => state.product);

    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [Stock, setStock] = useState(0);
    const [images, setImages] = useState([]);
    const [oldImages, setOldImages] = useState([]);
    const [imagesPreview, setImagesPreview] = useState([]);

    const productId = id;

    useEffect(() => {
        if (product && product._id !== productId) {
            dispatch(getProductDetails(productId));
        } else if (product) {
            setName(product.name);
            setDescription(product.description);
            setPrice(product.price);
            setCategory(product.category);
            setStock(product.Stock);
            setOldImages(product.images);
        }
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (updateError) {
            toast.error(updateError);
            dispatch(clearErrors());
        }
        if (isUpdated) {
            toast.success('Product Updated Successfully');
            navigate('/admin/products');
            dispatch({ type: UPDATE_PRODUCT_RESET });
        }
    }, [dispatch, error, navigate, isUpdated, productId, product, updateError]);

    const updateProductSubmitHandler = e => {
        e.preventDefault();
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('price', price);
        myForm.set('description', description);
        myForm.set('category', category);
        myForm.set('Stock', Stock);
        images.forEach(image => myForm.append('images', image));
        dispatch(updateProduct(productId, myForm));
    };

    const updateProductImagesChange = e => {
        const files = Array.from(e.target.files);
        setImages([]);
        setImagesPreview([]);
        setOldImages([]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.readyState === 2) {
                    setImagesPreview(old => [...old, reader.result]);
                    setImages(old => [...old, reader.result]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <Fragment>
            <MetaData title='Update Product · Admin' />
            <AdminPage title='Update Product'>
                <form
                    className='mx-auto max-w-2xl border border-line bg-surface p-8 sm:p-10'
                    encType='multipart/form-data'
                    onSubmit={updateProductSubmitHandler}
                >
                    <div className='flex flex-col gap-6'>
                        <div className='field-row'>
                            <SpellcheckIcon />
                            <input
                                type='text'
                                placeholder='Product Name'
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div className='grid gap-6 sm:grid-cols-2'>
                            <div className='field-row'>
                                <AttachMoneyIcon />
                                <input
                                    type='number'
                                    placeholder='Price'
                                    required
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                />
                            </div>
                            <div className='field-row'>
                                <StorageIcon />
                                <input
                                    type='number'
                                    placeholder='Stock'
                                    required
                                    value={Stock}
                                    onChange={e => setStock(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className='field-row'>
                            <AccountTreeIcon />
                            <select value={category} onChange={e => setCategory(e.target.value)}>
                                <option value=''>Choose Category</option>
                                {categories.map(cate => (
                                    <option key={cate} value={cate}>{cate}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className='eyebrow'>Description</label>
                            <textarea
                                placeholder='Describe the piece…'
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows='5'
                                className='mt-3 w-full resize-none border border-line bg-transparent p-4 font-sans text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                            ></textarea>
                        </div>

                        <div>
                            <label className='eyebrow'>Images</label>
                            <label className='mt-3 flex cursor-pointer items-center justify-center border border-dashed border-line py-8 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft transition-colors hover:border-brass hover:text-brass'>
                                Replace Images
                                <input
                                    type='file'
                                    name='avatar'
                                    accept='image/*'
                                    onChange={updateProductImagesChange}
                                    multiple
                                    className='hidden'
                                />
                            </label>

                            {oldImages && oldImages.length > 0 && (
                                <div className='mt-5'>
                                    <p className='font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                                        Current
                                    </p>
                                    <div className='mt-3 flex flex-wrap gap-3'>
                                        {oldImages.map((image, index) => (
                                            <img
                                                key={index}
                                                src={image.url}
                                                alt='Current Product'
                                                className='h-20 w-20 border border-line object-cover'
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {imagesPreview.length > 0 && (
                                <div className='mt-5'>
                                    <p className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass'>
                                        New
                                    </p>
                                    <div className='mt-3 flex flex-wrap gap-3'>
                                        {imagesPreview.map((image, index) => (
                                            <img
                                                key={index}
                                                src={image}
                                                alt='Product Preview'
                                                className='h-20 w-20 border border-brass object-cover'
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button type='submit' disabled={loading} className='btn-solid w-full disabled:opacity-40'>
                            {loading ? 'Updating…' : 'Update Product'}
                        </button>
                    </div>
                </form>
            </AdminPage>
        </Fragment>
    );
};

export default UpdateProduct;

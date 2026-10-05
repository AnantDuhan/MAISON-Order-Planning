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
import VariantEditor, { variantFormFields, variantTotalStock } from './VariantEditor';
import PhotoColorTags, { colourValues, useFileThumbnails } from './PhotoColorTags';
import ButtonSpinner from '../layout/ButtonSpinner';

const categories = [
    'Laptop', 'Footwear', 'Bottom', 'Tops', 'Attire',
    'Camera', 'SmartPhones', 'Jeans',
];
const ADD_CATEGORY_OPTION = '__add_new_category__';

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
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [Stock, setStock] = useState(0);
    const [variantData, setVariantData] = useState({ options: [], variants: [] });
    const hasOptions = variantData.options.length > 0;
    const colours = colourValues(variantData.options);
    const [oldPhotoTags, setOldPhotoTags] = useState({});
    const [newPhotoTags, setNewPhotoTags] = useState({});
    const [images, setImages] = useState([]);
    const newPhotos = useFileThumbnails(images);
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
            setVariantData({
                options: product.options || [],
                variants: (product.variants || []).map(v => ({ ...v, price: v.price ?? '' })),
            });
            setOldImages(product.images);
            setOldPhotoTags(Object.fromEntries((product.images || []).filter(img => img.color).map(img => [img._id, img.color])));
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
        const productCategory = isAddingCategory ? newCategory.trim() : category;
        if (!productCategory) {
            toast.error('Please choose or enter a category');
            return;
        }

        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('price', price);
        myForm.set('description', description);
        myForm.set('category', productCategory);
        myForm.set('Stock', hasOptions ? variantTotalStock(variantData.variants) : Stock);
        const variantFields = variantFormFields(variantData);
        myForm.set('options', variantFields.options);
        myForm.set('variants', variantFields.variants);
        // Photo colours: new uploads replace the current photos (in upload
        // order); otherwise the current photos are re-tagged by id.
        if (images.length) {
            myForm.set('imageColors', JSON.stringify(images.map((_, i) => newPhotoTags[String(i)] || '')));
        } else {
            myForm.set('imageTags', JSON.stringify(Object.fromEntries((oldImages || []).map(img => [img._id, oldPhotoTags[img._id] || '']))));
        }
        images.forEach(image => myForm.append('product', image));
        dispatch(updateProduct(productId, myForm));
    };

    const updateProductImagesChange = e => {
        const files = Array.from(e.target.files);
        setImages(files);
        setImagesPreview([]);
        setNewPhotoTags({});
        setOldImages([]);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.readyState === 2) {
                    setImagesPreview(old => [...old, reader.result]);
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
                                    value={hasOptions ? variantTotalStock(variantData.variants) : Stock}
                                    disabled={hasOptions}
                                    title={hasOptions ? 'Stock is set per variant below' : undefined}
                                    onChange={e => setStock(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className='field-row'>
                            <AccountTreeIcon />
                            <select
                                value={isAddingCategory ? ADD_CATEGORY_OPTION : category}
                                required={!isAddingCategory}
                                onChange={e => {
                                    const selectedCategory = e.target.value;
                                    if (selectedCategory === ADD_CATEGORY_OPTION) {
                                        setIsAddingCategory(true);
                                        setNewCategory('');
                                        return;
                                    }
                                    setCategory(selectedCategory);
                                    setIsAddingCategory(false);
                                    setNewCategory('');
                                }}
                            >
                                <option value=''>Choose Category</option>
                                {category && !categories.includes(category) && !isAddingCategory && (
                                    <option value={category}>{category}</option>
                                )}
                                {categories.map(cate => (
                                    <option key={cate} value={cate}>{cate}</option>
                                ))}
                                <option value={ADD_CATEGORY_OPTION}>Add new category…</option>
                            </select>
                        </div>
                        {isAddingCategory && (
                            <div className='field-row'>
                                <AccountTreeIcon />
                                <input
                                    type='text'
                                    placeholder='New category name'
                                    aria-label='New category name'
                                    maxLength={80}
                                    required
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                />
                            </div>
                        )}

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
                                    accept='image/png,image/jpeg,image/webp'
                                    onChange={updateProductImagesChange}
                                    multiple
                                    className='hidden'
                                />
                            </label>

                            {colours.length > 0 && images.length === 0 && (
                                <PhotoColorTags
                                    title='Current photos — which colour is each?'
                                    photos={(oldImages || []).map(img => ({ key: img._id, src: img.url }))}
                                    colours={colours}
                                    tags={oldPhotoTags}
                                    onChange={setOldPhotoTags}
                                />
                            )}
                            {colours.length > 0 && images.length > 0 && (
                                <PhotoColorTags title='New photos (replace the current ones) — which colour is each?' photos={newPhotos} colours={colours} tags={newPhotoTags} onChange={setNewPhotoTags} accent />
                            )}

                            {colours.length === 0 && oldImages && oldImages.length > 0 && (
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

                            {colours.length === 0 && imagesPreview.length > 0 && (
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

                        <VariantEditor category={isAddingCategory ? newCategory : category} value={variantData} onChange={setVariantData} />

                        <button type='submit' disabled={loading} className='btn-solid w-full disabled:opacity-40'>
                            {loading ? (
                                        <>
                                            <ButtonSpinner />
                                            Updating…
                                        </>
                                    ) : (
                                        'Update Product'
                                    )}
                        </button>
                    </div>
                </form>
            </AdminPage>
        </Fragment>
    );
};

export default UpdateProduct;

import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, getProductDetails, updateProduct } from '../../actions/productAction';
import { UPDATE_PRODUCT_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import Field from '../layout/Field';
import AdminPage from './shared/AdminPage';
import ProductDetailsEditor, { toDetailFields } from './ProductDetailsEditor';
import VariantEditor, { variantFormFields, variantTotalStock } from './VariantEditor';
import PhotoColorTags, { colourValues, useFileThumbnails } from './PhotoColorTags';
import ButtonSpinner from '../layout/ButtonSpinner';
import { categoryGroups, useCategories } from '../../utils/useCategories';
import { checkPhotoTags, checkProductPhotos, photoLimitHint, shrinkPhotos } from '../../utils/photoLimits';


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
    const [earlyAccess, setEarlyAccess] = useState(''); // '' unchanged · 'start' · 'end'
    const earlyAccessUntil = product?.earlyAccessUntil ? new Date(product.earlyAccessUntil) : null;
    const earlyAccessLive = earlyAccessUntil && earlyAccessUntil > new Date();
    const { categories: categoryTree } = useCategories({ admin: true });
    const groups = categoryGroups(categoryTree.filter(d => d.isActive !== false));
    // Keep a product's current category selectable even if it was hidden or renamed elsewhere.
    const known = groups.some(g => g.options.some(n => n.toLowerCase() === String(category).toLowerCase()));
    const categoryOptions = { groups, extra: category && !known ? category : null };
    const [Stock, setStock] = useState(0);
    const [variantData, setVariantData] = useState({ options: [], variants: [] });
    const [details, setDetails] = useState({ highlights: [], specs: [] });
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
            setDetails({ highlights: product.highlights || [], specs: product.specs || [] });
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

    const updateProductSubmitHandler = async e => {
        e.preventDefault();
        const productCategory = category;
        if (!productCategory) {
            toast.error('Please choose or enter a category');
            return;
        }

        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('price', price);
        myForm.set('description', description);
        const detailFields = toDetailFields(details);
        myForm.set('highlights', detailFields.highlights);
        myForm.set('specs', detailFields.specs);
        myForm.set('category', productCategory);
        if (earlyAccess) myForm.set('earlyAccess', earlyAccess);
        myForm.set('Stock', hasOptions ? variantTotalStock(variantData.variants) : Stock);
        const variantFields = variantFormFields(variantData);
        myForm.set('options', variantFields.options);
        myForm.set('variants', variantFields.variants);
        // Photo colours: new uploads replace the current photos (in upload
        // order); otherwise the current photos are re-tagged by id.
        if (images.length) {
            const tags = images.map((_, i) => newPhotoTags[String(i)] || '');
            if (!checkPhotoTags(tags)) return;
            myForm.set('imageColors', JSON.stringify(tags));
        } else {
            const tagsById = Object.fromEntries((oldImages || []).map(img => [img._id, oldPhotoTags[img._id] || '']));
            if (!checkPhotoTags(Object.values(tagsById))) return;
            myForm.set('imageTags', JSON.stringify(tagsById));
        }
        (await shrinkPhotos(images)).forEach(image => myForm.append('product', image));
        dispatch(updateProduct(productId, myForm));
    };

    const updateProductImagesChange = e => {
        const files = checkProductPhotos(e.target.files, colours.length);
        if (!files) {
            e.target.value = '';
            return;
        }
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
                        <Field label='Product name'>
                            <input
                                type='text'
                                placeholder='e.g. Halo Cushion Pendant'
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </Field>

                        <div className='grid gap-6 sm:grid-cols-2'>
                            <Field label='Price'>
                                <span className='shrink-0 font-sans text-ink-soft'>₹</span>
                                <input
                                    type='number'
                                    placeholder='0'
                                    required
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                />
                            </Field>
                            <Field label='Stock' hint={hasOptions ? 'Set per variant below' : null}>
                                <input
                                    type='number'
                                    placeholder='0'
                                    required
                                    value={hasOptions ? variantTotalStock(variantData.variants) : Stock}
                                    disabled={hasOptions}
                                    title={hasOptions ? 'Stock is set per variant below' : undefined}
                                    onChange={e => setStock(e.target.value)}
                                />
                            </Field>
                        </div>

                        <Field label='Category'>
                            <select value={category} onChange={e => setCategory(e.target.value)} required>
                                <option value=''>Choose a category</option>
                                {categoryOptions.extra && <option value={categoryOptions.extra}>{categoryOptions.extra}</option>}
                                {categoryOptions.groups.map(group => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.options.map(name => (
                                            <option key={name} value={name}>{name === group.label ? `${name} (whole department)` : name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </Field>
                        <p className='-mt-2 font-sans text-xs text-ink-faint'>
                            Missing one? <Link to='/admin/categories' className='text-brass underline-offset-4 hover:underline'>Manage categories</Link>
                        </p>

                        <div className='border border-line p-4'>
                            <p className='font-sans text-sm text-ink'>Plus early access</p>
                            <p className='mt-1 font-sans text-xs text-ink-faint'>
                                {earlyAccessLive
                                    ? `Only Plus members can buy this until ${earlyAccessUntil.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.`
                                    : 'Open to everyone.'}
                            </p>
                            <label className='mt-3 flex items-center gap-3'>
                                <input
                                    type='checkbox'
                                    checked={Boolean(earlyAccess)}
                                    onChange={e => setEarlyAccess(e.target.checked ? (earlyAccessLive ? 'end' : 'start') : '')}
                                    className='h-4 w-4 accent-[#A07C4B]'
                                />
                                <span className='font-sans text-sm text-ink'>
                                    {earlyAccessLive ? 'End early access now (open to everyone)' : 'Start 48 hours of Plus early access from now'}
                                </span>
                            </label>
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

                        <ProductDetailsEditor category={category} value={details} onChange={setDetails} />

                        <div>
                            <label className='eyebrow'>Images <span className='normal-case tracking-normal text-ink-faint'>· {photoLimitHint(colours.length)}</span></label>
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

                        <VariantEditor category={category} value={variantData} onChange={setVariantData} />

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

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import StorageIcon from '@mui/icons-material/Storage';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, createProduct } from '../../actions/productAction';
import { NEW_PRODUCT_RESET } from '../../constants/productConstants';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import ProductDetailsEditor, { toDetailFields } from './ProductDetailsEditor';
import VariantEditor, { variantFormFields, variantTotalStock, withOptions } from './VariantEditor';
import AiDraftPanel from './AiDraftPanel';
import PhotoColorTags, { colourValues, useFileThumbnails } from './PhotoColorTags';
import ButtonSpinner from '../layout/ButtonSpinner';
import { categoryGroups, useCategories } from '../../utils/useCategories';
import { checkPhotoTags, checkProductPhotos, photoLimitHint, shrinkPhotos } from '../../utils/photoLimits';


const NewProduct = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { loading, error, success } = useSelector(state => state.newProduct);

    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const { categories: categoryTree } = useCategories({ admin: true });
    const categoryOptions = { groups: categoryGroups(categoryTree.filter(d => d.isActive !== false)), extra: null };
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [earlyAccess, setEarlyAccess] = useState(false);
    const [Stock, setStock] = useState(0);
    const [variantData, setVariantData] = useState({ options: [], variants: [] });
    const [details, setDetails] = useState({ highlights: [], specs: [] });
    const hasOptions = variantData.options.length > 0;
    const colours = colourValues(variantData.options);
    const [photoTags, setPhotoTags] = useState({});
    const [images, setImages] = useState([]);
    const newPhotos = useFileThumbnails(images);
    const [imagesPreview, setImagesPreview] = useState([]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (success) {
            toast.success('Product Created Successfully');
            navigate('/admin/dashboard');
            dispatch({ type: NEW_PRODUCT_RESET });
        }
    }, [dispatch, error, navigate, success]);

    const createProductSubmitHandler = async e => {
        e.preventDefault();
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('price', price);
        myForm.set('description', description);
        const detailFields = toDetailFields(details);
        myForm.set('highlights', detailFields.highlights);
        myForm.set('specs', detailFields.specs);
        myForm.set('category', category);
        myForm.set('metaTitle', metaTitle);
        myForm.set('metaDescription', metaDescription);
        if (earlyAccess) myForm.set('earlyAccess', 'start');
        myForm.set('Stock', hasOptions ? variantTotalStock(variantData.variants) : Stock);
        const variantFields = variantFormFields(variantData);
        myForm.set('options', variantFields.options);
        myForm.set('variants', variantFields.variants);
        // Colour each photo shows, in upload order ('' = all colours).
        const tags = images.map((_, i) => photoTags[String(i)] || '');
        if (!checkPhotoTags(tags)) return;
        myForm.set('imageColors', JSON.stringify(tags));
        (await shrinkPhotos(images)).forEach(image => myForm.append('product', image));
        dispatch(createProduct(myForm));
    };

    const applyAiDraft = draft => {
        setName(draft.name);
        setDescription(draft.description);
        if (draft.category) setCategory(draft.category);
        setMetaTitle(draft.metaTitle);
        setMetaDescription(draft.metaDescription);
    };

    // Replace the values of the Colour option (or add one) with the AI's colours.
    const applyAiColours = colours => {
        const values = colours.map(c => ({ value: c.value, hex: c.hex || '#CBB79A' }));
        const { options, variants } = variantData;
        const i = options.findIndex(o => o.kind === 'color');
        const next = i >= 0
            ? options.map((o, j) => (j === i ? { ...o, values } : o))
            : [...options, { name: 'Colour', kind: 'color', values }].slice(0, 3);
        setVariantData(withOptions(next, variants));
    };

    const createProductImagesChange = e => {
        const files = checkProductPhotos(e.target.files, colours.length);
        if (!files) {
            e.target.value = '';
            return;
        }
        setImages(files);
        setImagesPreview([]);
        setPhotoTags({});
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
            <MetaData title='Create Product · Admin' />
            <AdminPage title='Create Product'>
                <form
                    className='mx-auto max-w-2xl border border-line bg-surface p-8 sm:p-10'
                    encType='multipart/form-data'
                    onSubmit={createProductSubmitHandler}
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
                                    value={price || ''}
                                    onChange={e => setPrice(e.target.value)}
                                />
                            </div>
                            <div className='field-row'>
                                <StorageIcon />
                                <input
                                    type='number'
                                    placeholder={hasOptions ? 'Stock is set per variant' : 'Stock'}
                                    required={!hasOptions}
                                    disabled={hasOptions}
                                    value={hasOptions ? variantTotalStock(variantData.variants) : (Stock || '')}
                                    onChange={e => setStock(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className='field-row'>
                            <AccountTreeIcon />
                            <select value={category} onChange={e => setCategory(e.target.value)} required>
                                <option value=''>Choose Category</option>
                                {categoryOptions.extra && <option value={categoryOptions.extra}>{categoryOptions.extra}</option>}
                                {categoryOptions.groups.map(group => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.options.map(name => (
                                            <option key={name} value={name}>{name === group.label ? `${name} (whole department)` : name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <p className='-mt-2 font-sans text-xs text-ink-faint'>
                            Missing one? <Link to='/admin/categories' className='text-brass underline-offset-4 hover:underline'>Manage categories</Link>
                        </p>

                        <label className='flex items-start gap-3 border border-line p-4'>
                            <input type='checkbox' checked={earlyAccess} onChange={e => setEarlyAccess(e.target.checked)} className='mt-1 h-4 w-4 accent-[#A07C4B]' />
                            <span>
                                <span className='block font-sans text-sm text-ink'>Launch with 48-hour Plus early access</span>
                                <span className='block font-sans text-xs text-ink-faint'>Everyone can see it, but only Maison Plus members can buy it for the first 48 hours.</span>
                            </span>
                        </label>

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
                                Choose Images
                                <input
                                    type='file'
                                    name='avatar'
                                    accept='image/png,image/jpeg,image/webp'
                                    onChange={createProductImagesChange}
                                    multiple
                                    className='hidden'
                                />
                            </label>

                            {colours.length > 0 && (
                                <PhotoColorTags title='Which colour is each photo?' photos={newPhotos} colours={colours} tags={photoTags} onChange={setPhotoTags} />
                            )}
                            {colours.length === 0 && imagesPreview.length > 0 && (
                                <div className='mt-4 flex flex-wrap gap-3'>
                                    {imagesPreview.map((image, index) => (
                                        <img
                                            key={index}
                                            src={image}
                                            alt='Product Preview'
                                            className='h-20 w-20 border border-line object-cover'
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <AiDraftPanel
                            images={images}
                            category={category}
                            onApply={applyAiDraft}
                            onApplyColours={applyAiColours}
                        />

                        <div className='grid gap-4'>
                            <label className='eyebrow'>Search listing (optional)</label>
                            <input
                                type='text'
                                placeholder='SEO title — defaults to the product name'
                                maxLength={70}
                                value={metaTitle}
                                onChange={e => setMetaTitle(e.target.value)}
                                className='border border-line bg-transparent p-3 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                            />
                            <textarea
                                rows='2'
                                placeholder='SEO description — defaults to the description'
                                maxLength={170}
                                value={metaDescription}
                                onChange={e => setMetaDescription(e.target.value)}
                                className='resize-none border border-line bg-transparent p-3 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                            />
                        </div>

                        <VariantEditor category={category} value={variantData} onChange={setVariantData} />

                        <button type='submit' disabled={loading} className='btn-solid w-full disabled:opacity-40'>
                            {loading ? (
                                        <>
                                            <ButtonSpinner />
                                            Creating…
                                        </>
                                    ) : (
                                        'Create Product'
                                    )}
                        </button>
                    </div>
                </form>
            </AdminPage>
        </Fragment>
    );
};

export default NewProduct;

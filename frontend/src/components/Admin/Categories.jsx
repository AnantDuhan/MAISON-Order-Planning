import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import axios from 'axios';
import React, { Fragment, useState } from 'react';
import { toast } from 'react-toastify';

import MetaData from '../layout/MetaData';
import Loader from '../layout/Loader/Loader';
import AdminPage from './shared/AdminPage';
import { useCategories } from '../../utils/useCategories';

const EMPTY = { _id: null, name: '', description: '', parent: '', sortOrder: 0, isActive: true };
const errorOf = (error, fallback) => error?.response?.data?.message || fallback;

/** Add / edit form, shown in place above the list. */
const CategoryForm = ({ initial, departments, onCancel, onSaved }) => {
    const [form, setForm] = useState(initial);
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const isEdit = Boolean(initial._id);
    const isDepartmentWithChildren = isEdit && departments.some(d => d._id === initial._id && d.children.length);
    const set = key => e => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const submit = async e => {
        e.preventDefault();
        setBusy(true);
        try {
            const body = { name: form.name, description: form.description, parent: form.parent || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive };
            const { data } = isEdit
                ? await axios.put(`/api/v1/admin/categories/${initial._id}`, body)
                : await axios.post('/api/v1/admin/categories', body);
            if (file) {
                const fd = new FormData();
                fd.append('image', file);
                await axios.put(`/api/v1/admin/categories/${data.category._id}/image`, fd);
            }
            toast.success(isEdit
                ? `Saved${data.productsUpdated ? ` · renamed on ${data.productsUpdated} products` : ''}`
                : `“${data.category.name}” added`);
            onSaved();
        } catch (error) {
            toast.error(errorOf(error, 'Could not save the category'));
        } finally {
            setBusy(false);
        }
    };

    const removeImage = async () => {
        setBusy(true);
        try {
            await axios.delete(`/api/v1/admin/categories/${initial._id}/image`);
            toast.success('Photo removed');
            onSaved();
        } catch (error) {
            toast.error(errorOf(error, 'Could not remove the photo'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className='mb-10 border border-line bg-surface p-6 sm:p-8'>
            <h2 className='font-display text-2xl text-ink'>{isEdit ? `Edit “${initial.name}”` : 'New category'}</h2>
            <div className='mt-6 grid gap-5 sm:grid-cols-2'>
                <label className='block'>
                    <span className='font-sans text-sm text-ink'>Name</span>
                    <input required maxLength={40} value={form.name} onChange={set('name')} className='mt-2 w-full border border-line bg-transparent px-3 py-2.5 font-sans text-sm text-ink focus:border-brass focus:outline-none' />
                </label>
                <label className='block'>
                    <span className='font-sans text-sm text-ink'>Sits inside</span>
                    <select value={form.parent || ''} onChange={set('parent')} disabled={isDepartmentWithChildren} className='mt-2 w-full border border-line bg-canvas px-3 py-2.5 font-sans text-sm text-ink focus:border-brass focus:outline-none disabled:opacity-60'>
                        <option value=''>Nothing — it’s a department</option>
                        {departments.filter(d => d._id !== initial._id).map(d => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                    </select>
                    {isDepartmentWithChildren && <span className='mt-1 block font-sans text-xs text-ink-faint'>Has categories inside, so it stays a department.</span>}
                </label>
                <label className='block sm:col-span-2'>
                    <span className='font-sans text-sm text-ink'>Short description <span className='text-ink-faint'>(shown on the home page)</span></span>
                    <input maxLength={160} value={form.description} onChange={set('description')} className='mt-2 w-full border border-line bg-transparent px-3 py-2.5 font-sans text-sm text-ink focus:border-brass focus:outline-none' />
                </label>
                <label className='block'>
                    <span className='font-sans text-sm text-ink'>Order <span className='text-ink-faint'>(lower shows first)</span></span>
                    <input type='number' value={form.sortOrder} onChange={set('sortOrder')} className='mt-2 w-full border border-line bg-transparent px-3 py-2.5 font-sans text-sm text-ink focus:border-brass focus:outline-none' />
                </label>
                <label className='flex items-center gap-3 self-end py-2.5'>
                    <input type='checkbox' checked={form.isActive} onChange={set('isActive')} className='h-4 w-4 accent-[#A07C4B]' />
                    <span className='font-sans text-sm text-ink'>Show in the store</span>
                </label>
                <div className='sm:col-span-2'>
                    <span className='font-sans text-sm text-ink'>Photo <span className='text-ink-faint'>(optional — otherwise the newest product photo is used)</span></span>
                    <div className='mt-2 flex flex-wrap items-center gap-4'>
                        {initial.image && !file && <img src={initial.image} alt='' className='h-16 w-16 border border-line object-cover' />}
                        <input type='file' accept='image/png,image/jpeg,image/webp' onChange={e => setFile(e.target.files?.[0] || null)} className='font-sans text-sm text-ink-soft' />
                        {initial.image && !file && (
                            <button type='button' onClick={removeImage} disabled={busy} className='font-sans text-sm text-danger hover:underline'>Remove photo</button>
                        )}
                    </div>
                </div>
            </div>
            <div className='mt-8 flex flex-wrap gap-3'>
                <button type='submit' disabled={busy} className='btn-solid !px-6 !py-3 disabled:opacity-60'>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add category'}</button>
                <button type='button' onClick={onCancel} disabled={busy} className='btn-outline !px-6 !py-3'>Cancel</button>
            </div>
        </form>
    );
};

const Row = ({ item, depth, onEdit, onDelete }) => {
    const img = item.image || item.displayImage;
    return (
        <li className={`flex items-center gap-4 border-b border-line py-4 ${depth ? 'pl-6 sm:pl-12' : ''}`}>
            <div className='h-12 w-12 shrink-0 overflow-hidden border border-line bg-surface-2'>
                {img
                    ? <img src={img} alt='' className='h-full w-full object-cover' />
                    : <span className='grid h-full w-full place-items-center text-ink-faint'><ImageOutlinedIcon fontSize='small' /></span>}
            </div>
            <div className='min-w-0 flex-1'>
                <p className={`truncate font-sans text-ink ${depth ? 'text-sm' : 'text-base font-medium'}`}>
                    {item.name}
                    {!item.isActive && <span className='ml-2 border border-line px-1.5 py-0.5 align-middle font-sans text-[0.6rem] uppercase tracking-luxe text-ink-faint'>Hidden</span>}
                </p>
                <p className='truncate font-sans text-xs text-ink-faint'>
                    {item.productCount} {item.productCount === 1 ? 'product' : 'products'}
                    {!depth && item.children?.length ? ` · ${item.children.length} inside` : ''}
                    {item.description ? ` · ${item.description}` : ''}
                </p>
            </div>
            <button type='button' onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} className='grid h-11 w-11 place-items-center text-ink-soft hover:text-brass'><EditOutlinedIcon fontSize='small' /></button>
            <button type='button' onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`} className='grid h-11 w-11 place-items-center text-ink-soft hover:text-danger'><DeleteOutlineIcon fontSize='small' /></button>
        </li>
    );
};

const Categories = () => {
    const { categories, loading, reload } = useCategories({ admin: true });
    const [editing, setEditing] = useState(null);

    const remove = async item => {
        // Deliberately no confirm() dialog: the server refuses deletes that would orphan products.
        try {
            await axios.delete(`/api/v1/admin/categories/${item._id}`);
            toast.success(`“${item.name}” deleted`);
            reload();
        } catch (error) {
            toast.error(errorOf(error, 'Could not delete the category'));
        }
    };

    const edit = item => {
        setEditing({ ...EMPTY, ...item, parent: item.parent || '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Fragment>
            <MetaData title='Categories · Admin' noIndex />
            <AdminPage
                title='Categories'
                action={!editing && (
                    <button type='button' onClick={() => setEditing({ ...EMPTY })} className='btn-solid inline-flex items-center gap-2 !px-5 !py-3'>
                        <AddIcon sx={{ fontSize: 18 }} /> New category
                    </button>
                )}
            >
                <p className='-mt-6 mb-8 max-w-2xl font-sans text-sm leading-relaxed text-ink-soft'>
                    Departments show on the home page and in the shop filter, in the order set here. Categories inside a department
                    are what products are filed under. Renaming one renames it on its products; a category in use can be hidden
                    but not deleted.
                </p>

                {editing && (
                    <CategoryForm
                        key={editing._id || 'new'}
                        initial={editing}
                        departments={categories}
                        onCancel={() => setEditing(null)}
                        onSaved={() => { setEditing(null); reload(); }}
                    />
                )}

                {loading ? <Loader label='Loading categories' /> : (
                    <ul className='border-t border-line'>
                        {categories.map(dept => (
                            <Fragment key={dept._id}>
                                <Row item={dept} depth={0} onEdit={edit} onDelete={remove} />
                                {dept.children.map(child => (
                                    <Row key={child._id} item={child} depth={1} onEdit={edit} onDelete={remove} />
                                ))}
                            </Fragment>
                        ))}
                    </ul>
                )}
            </AdminPage>
        </Fragment>
    );
};

export default Categories;

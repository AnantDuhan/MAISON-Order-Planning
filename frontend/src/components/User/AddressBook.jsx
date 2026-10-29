import React, { Fragment, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { countryName, stateName } from '../../utils/indiaRegions';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { addAddress, deleteAddress } from '../../actions/userAction';
import MetaData from '../layout/MetaData';
import AddressFields, { EMPTY_ADDRESS, addressError } from './AddressFields';

const emptyForm = EMPTY_ADDRESS;


const AddressBook = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.user);
    const addresses = user?.addresses || [];

    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const submitHandler = async e => {
        e.preventDefault();
        const problem = addressError(form);
        if (problem) {
            toast.error(problem);
            return;
        }
        try {
            setSaving(true);
            await dispatch(addAddress(form));
            toast.success('Address saved');
            setForm(emptyForm);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not save address');
        } finally {
            setSaving(false);
        }
    };

    const removeHandler = async id => {
        try {
            setDeletingId(id);
            await dispatch(deleteAddress(id));
            toast.success('Address removed');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not remove address');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Fragment>
            <MetaData title='Address Book · Maison' />
            <div className='editorial-shell py-12'>
                <p className='eyebrow'>Account</p>
                <h1 className='heading-display mt-2 text-4xl sm:text-5xl'>Address Book</h1>

                <div className='mt-10 grid gap-10 lg:grid-cols-2'>
                    {/* Saved addresses */}
                    <div>
                        <p className='eyebrow'>Saved addresses</p>
                        {addresses.length === 0 ? (
                            <p className='mt-4 font-sans text-sm text-ink-soft'>
                                No saved addresses yet. Add one to speed up checkout.
                            </p>
                        ) : (
                            <div className='mt-4 flex flex-col gap-4'>
                                {addresses.map(a => (
                                    <div
                                        key={a._id}
                                        className='flex items-start justify-between gap-4 border border-line bg-surface p-5'
                                    >
                                        <div className='font-sans text-sm text-ink'>
                                            {a.label && (
                                                <span className='eyebrow block !text-brass'>{a.label}</span>
                                            )}
                                            <p className={a.label ? 'mt-2' : ''}>{a.address}</p>
                                            <p className='text-ink-soft'>
                                                {a.city}, {stateName(a.country, a.state)}, {a.pinCode}
                                            </p>
                                            <p className='text-ink-soft'>{countryName(a.country)}</p>
                                            <p className='text-ink-soft'>+91 {a.phoneNumber}</p>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() => removeHandler(a._id)}
                                            disabled={deletingId === a._id}
                                            className='text-ink-soft transition-colors hover:text-brass disabled:opacity-40'
                                            aria-label='Delete address'
                                        >
                                            <DeleteOutlineIcon fontSize='small' />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add address */}
                    <div>
                        <p className='eyebrow'>Add a new address</p>
                        <form
                            className='mt-4 flex flex-col gap-8 border border-line bg-surface p-6 sm:p-8'
                            onSubmit={submitHandler}
                        >
                            <AddressFields value={form} onChange={setField} withLabel />
                            <button
                                type='submit'
                                disabled={saving}
                                className='btn-solid mt-1 w-full disabled:opacity-40'
                            >
                                {saving ? 'Saving…' : 'Save address'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default AddressBook;

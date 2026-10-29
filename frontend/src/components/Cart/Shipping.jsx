import React, { Fragment, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

import { saveShippingInfo } from '../../actions/cartAction';
import { addAddress } from '../../actions/userAction';
import { stateName } from '../../utils/indiaRegions';
import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';
import AddressFields, { EMPTY_ADDRESS, addressError } from '../User/AddressFields';

const pick = a => ({
    address: a.address || '',
    city: a.city || '',
    state: a.state || '',
    country: a.country || 'IN',
    pinCode: String(a.pinCode || ''),
    phoneNumber: String(a.phoneNumber || ''),
});

const sameAddress = (a, b) => a.address === b.address && a.city === b.city && String(a.pinCode) === String(b.pinCode);

const Shipping = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { shippingInfo } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.user);
    const savedAddresses = user?.addresses || [];

    // Start from the last address used, or the first saved one.
    const initial = shippingInfo?.address ? pick(shippingInfo) : savedAddresses[0] ? pick(savedAddresses[0]) : { ...EMPTY_ADDRESS };
    const [form, setForm] = useState(initial);
    const [selectedId, setSelectedId] = useState(() => savedAddresses.find(a => sameAddress(a, initial))?._id || (savedAddresses.length && !shippingInfo?.address ? savedAddresses[0]._id : null));
    const [saveToBook, setSaveToBook] = useState(false);
    const usingNew = !selectedId;

    const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const choose = a => {
        setSelectedId(a._id);
        setForm(pick(a));
    };

    const useNewAddress = () => {
        setSelectedId(null);
        setForm({ ...EMPTY_ADDRESS });
    };

    const shippingSubmit = async e => {
        e.preventDefault();
        const problem = addressError(form);
        if (problem) {
            toast.error(problem);
            return;
        }
        dispatch(saveShippingInfo(form));
        if (usingNew && saveToBook) {
            try {
                await dispatch(addAddress({ label: '', ...form }));
                toast.success('Address saved');
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Could not save address');
            }
        }
        navigate('/order/confirm');
    };

    return (
        <Fragment>
            <MetaData title='Shipping Details · Maison' noIndex />
            <CheckoutSteps activeStep={0} />

            <div className='editorial-shell pb-20 pt-8'>
                <div className='mx-auto max-w-2xl'>
                    <p className='eyebrow'>Where to</p>
                    <h1 className='heading-display mt-2 text-4xl'>Shipping details</h1>

                    <form className='mt-8' onSubmit={shippingSubmit}>
                        {savedAddresses.length > 0 && (
                            <fieldset>
                                <legend className='eyebrow'>Saved addresses</legend>
                                <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                                    {savedAddresses.map(a => {
                                        const active = selectedId === a._id;
                                        return (
                                            <button
                                                key={a._id}
                                                type='button'
                                                role='radio'
                                                aria-checked={active}
                                                onClick={() => choose(a)}
                                                className={`relative border p-5 text-left font-sans text-sm transition-colors duration-300 ${active ? 'border-brass bg-surface' : 'border-line bg-surface hover:border-ink-faint'}`}
                                            >
                                                <span aria-hidden='true' className={`absolute right-4 top-4 grid h-4 w-4 place-items-center rounded-full border ${active ? 'border-brass' : 'border-line'}`}>
                                                    {active && <span className='h-2 w-2 rounded-full bg-brass' />}
                                                </span>
                                                {a.label && <span className='eyebrow block'>{a.label}</span>}
                                                <span className={`block pr-6 text-ink ${a.label ? 'mt-2' : ''}`}>{a.address}</span>
                                                <span className='block text-ink-soft'>{a.city}, {stateName(a.country, a.state)} {a.pinCode}</span>
                                                <span className='block text-ink-soft'>+91 {a.phoneNumber}</span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        type='button'
                                        role='radio'
                                        aria-checked={usingNew}
                                        onClick={useNewAddress}
                                        className={`grid min-h-[7rem] place-items-center border border-dashed p-5 font-sans text-xs uppercase tracking-luxe transition-colors duration-300 ${usingNew ? 'border-brass text-brass' : 'border-line text-ink-soft hover:border-ink-faint hover:text-ink'}`}
                                    >
                                        + A different address
                                    </button>
                                </div>
                            </fieldset>
                        )}

                        {usingNew && (
                            <div className={`border border-line bg-surface p-6 sm:p-8 ${savedAddresses.length ? 'mt-6' : ''}`}>
                                <AddressFields value={form} onChange={setField} />
                                <label className='mt-6 flex cursor-pointer items-center gap-3 font-sans text-sm text-ink-soft'>
                                    <input type='checkbox' checked={saveToBook} onChange={e => setSaveToBook(e.target.checked)} className='h-4 w-4 accent-brass' />
                                    Save this address for next time
                                </label>
                            </div>
                        )}

                        <button type='submit' className='btn-solid mt-8 w-full sm:w-auto sm:min-w-[16rem]'>
                            Continue to review
                        </button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default Shipping;

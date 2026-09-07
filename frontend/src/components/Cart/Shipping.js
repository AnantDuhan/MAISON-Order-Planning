import HomeIcon from '@mui/icons-material/Home';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PhoneIcon from '@mui/icons-material/Phone';
import PinDropIcon from '@mui/icons-material/PinDrop';
import PublicIcon from '@mui/icons-material/Public';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import { Country, State } from 'country-state-city';
import React, { Fragment, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

import { saveShippingInfo } from '../../actions/cartAction';
import { addAddress } from '../../actions/userAction';
import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';

const Shipping = () => {
    const dispatch = useDispatch();
    const { shippingInfo } = useSelector(state => state.cart);
    const { user } = useSelector(state => state.user);
    const savedAddresses = user?.addresses || [];
    const navigate = useNavigate();

    const [address, setAddress] = useState(shippingInfo.address);
    const [city, setCity] = useState(shippingInfo.city);
    const [state, setState] = useState(shippingInfo.state);
    const [country, setCountry] = useState(shippingInfo.country);
    const [pinCode, setPinCode] = useState(shippingInfo.pinCode);
    const [phoneNumber, setPhoneNumber] = useState(shippingInfo.phoneNumber);
    const [saveToBook, setSaveToBook] = useState(false);
    const [addressMode, setAddressMode] = useState(savedAddresses.length ? 'saved' : 'new');

    // Populate the form from a saved address (state/country are ISO codes,
    // matching the selects below).
    const fillFrom = a => {
        setAddressMode('saved');
        setAddress(a.address);
        setCity(a.city);
        setCountry(a.country);
        setState(a.state);
        setPinCode(String(a.pinCode));
        setPhoneNumber(String(a.phoneNumber));
    };

    const useNewAddress = () => {
        setAddressMode('new');
        setAddress('');
        setCity('');
        setState('');
        setCountry('');
        setPinCode('');
        setPhoneNumber('');
    };

    const shippingSubmit = async e => {
        e.preventDefault();
        if (String(phoneNumber).length !== 10) {
            toast.error('Phone Number should be 10 digits long');
            return;
        }
        dispatch(saveShippingInfo({ address, city, state, country, pinCode, phoneNumber }));
        if (saveToBook) {
            try {
                await dispatch(addAddress({ label: '', address, city, state, country, pinCode, phoneNumber }));
                toast.success('Address saved');
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Could not save address');
            }
        }
        navigate('/order/confirm');
    };

    return (
        <Fragment>
            <MetaData title='Shipping Details · Maison' />
            <CheckoutSteps activeStep={0} />

            <div className='form-shell !min-h-0'>
                <div className='form-card !max-w-lg'>
                    <p className='eyebrow'>Where to</p>
                    <h2 className='heading-display mt-2 text-3xl'>Shipping Details</h2>

                    {savedAddresses.length > 0 && (
                        <div className='mt-6'>
                            <p className='eyebrow'>Choose shipping address</p>
                            <div className='mt-3 flex flex-wrap gap-2'>
                                {savedAddresses.map(a => (
                                    <button
                                        key={a._id}
                                        type='button'
                                        onClick={() => fillFrom(a)}
                                        className={`border px-3 py-2 text-left font-sans text-[0.72rem] uppercase tracking-luxe transition-colors ${
                                            addressMode === 'saved' && address === a.address && city === a.city
                                                ? 'border-brass text-brass'
                                                : 'border-line text-ink-soft hover:border-brass hover:text-brass'
                                        }`}
                                    >
                                        {a.label ? `${a.label} · ` : ''}{a.city}, {a.pinCode}
                                    </button>
                                ))}
                                <button
                                    type='button'
                                    onClick={useNewAddress}
                                    className={`border px-3 py-2 font-sans text-[0.72rem] uppercase tracking-luxe transition-colors ${
                                        addressMode === 'new'
                                            ? 'border-brass text-brass'
                                            : 'border-line text-ink-soft hover:border-brass hover:text-brass'
                                    }`}
                                >
                                    Enter a new address
                                </button>
                            </div>
                        </div>
                    )}

                    <form className='mt-8 flex flex-col gap-6' encType='multipart/form-data' onSubmit={shippingSubmit}>
                        <div className='field-row'>
                            <HomeIcon />
                            <input type='text' placeholder='Address' required value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                        <div className='field-row'>
                            <LocationCityIcon />
                            <input type='text' placeholder='City' required value={city} onChange={e => setCity(e.target.value)} />
                        </div>
                        <div className='field-row'>
                            <PinDropIcon />
                            <input type='text' placeholder='Pin Code' required value={pinCode} onChange={e => setPinCode(e.target.value)} />
                        </div>
                        <div className='field-row'>
                            <PhoneIcon />
                            <input type='text' placeholder='Phone Number' required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                        </div>
                        <div className='field-row'>
                            <PublicIcon />
                            <select required value={country} onChange={e => setCountry(e.target.value)}>
                                <option value=''>Country</option>
                                {Country &&
                                    Country.getAllCountries().map(item => (
                                        <option key={item.isoCode} value={item.isoCode}>{item.name}</option>
                                    ))}
                            </select>
                        </div>

                        {country && (
                            <div className='field-row'>
                                <TransferWithinAStationIcon />
                                <select required value={state} onChange={e => setState(e.target.value)}>
                                    <option value=''>State</option>
                                    {State &&
                                        State.getStatesOfCountry(country).map(item => (
                                            <option key={item.isoCode} value={item.isoCode}>{item.name}</option>
                                        ))}
                                </select>
                            </div>
                        )}

                        <label className='flex cursor-pointer items-center gap-3 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft'>
                            <input
                                type='checkbox'
                                checked={saveToBook}
                                onChange={e => setSaveToBook(e.target.checked)}
                                className='h-4 w-4 accent-brass'
                            />
                            Save this address to my address book
                        </label>

                        <button type='submit' className='btn-solid mt-2 w-full disabled:opacity-40' disabled={!state}>
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default Shipping;

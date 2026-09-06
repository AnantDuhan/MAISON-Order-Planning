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
import CheckoutSteps from '../Cart/CheckoutSteps';
import MetaData from '../layout/MetaData';

const Shipping = () => {
    const dispatch = useDispatch();
    const { shippingInfo } = useSelector(state => state.cart);
    const navigate = useNavigate();

    const [address, setAddress] = useState(shippingInfo.address);
    const [city, setCity] = useState(shippingInfo.city);
    const [state, setState] = useState(shippingInfo.state);
    const [country, setCountry] = useState(shippingInfo.country);
    const [pinCode, setPinCode] = useState(shippingInfo.pinCode);
    const [phoneNumber, setPhoneNumber] = useState(shippingInfo.phoneNumber);

    const shippingSubmit = e => {
        e.preventDefault();
        if (phoneNumber.length !== 10) {
            toast.error('Phone Number should be 10 digits long');
            return;
        }
        dispatch(saveShippingInfo({ address, city, state, country, pinCode, phoneNumber }));
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

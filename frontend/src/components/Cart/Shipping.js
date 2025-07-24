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

import './Shipping.css';

const Shipping = () => {

    const dispatch = useDispatch();
    const { shippingInfo } = useSelector((state) => state.cart);
    const navigate = useNavigate();

  const [address, setAddress] = useState(shippingInfo.address);
  const [city, setCity] = useState(shippingInfo.city);
  const [state, setState] = useState(shippingInfo.state);
  const [country, setCountry] = useState(shippingInfo.country);
  const [pinCode, setPinCode] = useState(shippingInfo.pinCode);
  const [phoneNumber, setPhoneNumber] = useState(shippingInfo.phoneNumber);

    const shippingSubmit = (e) => {
        e.preventDefault();

        if (phoneNumber.length < 10 || phoneNumber.length > 10) {
            toast.success("Phone Number should be 10 digits long");
            return;
        }
        dispatch(saveShippingInfo({ address, city, state, country, pinCode, phoneNumber }));
        navigate('/order/confirm');
    }

    return (
        <Fragment>
            <MetaData title="Shipping Details" />

            <CheckoutSteps activeStep={0} />

            <div className="shippingContainer">
                <div className="shippingBox">
                    <h2 className="shippingHeading">Shipping Details</h2>

                    <form
                        className="shippingForm"
                        encType="multipart/form-data"
                        onSubmit={shippingSubmit}
                    >
                        <div>
                            <HomeIcon />
                            <input
                                type="text"
                                placeholder="Address"
                                required
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>
                        <div>
                            <LocationCityIcon />
                            <input
                                type="text"
                                placeholder="City"
                                required
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            />
                        </div>
                        <div>
                            <PinDropIcon />
                            <input
                                type="text"
                                placeholder="PinCode"
                                required
                                value={pinCode}
                                onChange={(e) => setPinCode(e.target.value)}
                            />
                        </div>
                        <div>
                            <PhoneIcon />
                            <input
                                type="text"
                                placeholder="Phone Number"
                                required
                                value={phoneNumber}
                                onChange={(e) =>setPhoneNumber(e.target.value)}
                            />
                        </div>
                        <div>
                            <PublicIcon />
                            <select
                                required
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                            >
                                <option value="">Country</option>
                                {Country &&
                                    Country.getAllCountries().map((item) => (
                                        <option
                                            key={item.isoCode}
                                            value={item.isoCode}
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {country && (
                            <div>
                                <TransferWithinAStationIcon />
                                <select
                                    required
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                >
                                    <option value="">State</option>
                                    {State &&
                                        State.getStatesOfCountry(country).map(
                                            (item) => (
                                                <option
                                                    key={item.isoCode}
                                                    value={item.isoCode}
                                                >
                                                    {item.name}
                                                </option>
                                            )
                                        )}
                                </select>
                            </div>
                        )}

                        <input
                            type="submit"
                            value="Continue"
                            className="shippingBtn"
                            disabled={state ? false : true}
                        />
                    </form>
                </div>
            </div>
        </Fragment>
    );
};

export default Shipping;

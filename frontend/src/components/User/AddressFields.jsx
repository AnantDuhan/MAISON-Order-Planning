import React from 'react';
import { COUNTRIES, statesOf } from '../../utils/indiaRegions';
import Field from '../layout/Field';

export const EMPTY_ADDRESS = { label: '', address: '', city: '', state: '', country: 'IN', pinCode: '', phoneNumber: '' };

/** Problems with an address before it's sent, or '' when it's fine. */
export const addressError = a => {
    if (!/^\d{6}$/.test(String(a.pinCode || '').trim())) return 'Pin code should be 6 digits';
    if (!/^\d{10}$/.test(String(a.phoneNumber || '').trim())) return 'Phone number should be 10 digits';
    if (!a.state) return 'Choose a state';
    return '';
};

/**
 * The address form used at checkout and in the address book, so both look
 * and validate the same. Country is fixed while Maison ships only in India.
 */
const AddressFields = ({ value, onChange, withLabel = false }) => {
    const set = key => e => onChange(key, e.target.value);
    const digits = (key, max) => e => onChange(key, e.target.value.replace(/\D/g, '').slice(0, max));
    const onlyCountry = COUNTRIES.length === 1 ? COUNTRIES[0] : null;

    return (
        <div className='grid gap-x-6 gap-y-6 sm:grid-cols-2'>
            {withLabel && (
                <Field label='Label (optional)' className='sm:col-span-2'>
                    <input type='text' placeholder='Home, Office…' value={value.label} onChange={set('label')} maxLength={30} />
                </Field>
            )}
            <Field label='Address' className='sm:col-span-2'>
                <input type='text' required autoComplete='street-address' placeholder='House no., street, area' value={value.address} onChange={set('address')} />
            </Field>
            <Field label='City'>
                <input type='text' required autoComplete='address-level2' value={value.city} onChange={set('city')} />
            </Field>
            <Field label='Pin code'>
                <input type='text' required inputMode='numeric' autoComplete='postal-code' pattern='\d{6}' title='6-digit pin code' value={value.pinCode} onChange={digits('pinCode', 6)} />
            </Field>
            <Field label='State'>
                <select required autoComplete='address-level1' value={value.state} onChange={set('state')}>
                    <option value=''>Choose a state</option>
                    {statesOf(value.country || 'IN').map(item => (
                        <option key={item.isoCode} value={item.isoCode}>{item.name}</option>
                    ))}
                </select>
            </Field>
            <Field label='Phone'>
                <span className='shrink-0 font-sans text-ink-soft'>+91</span>
                <input type='tel' required inputMode='numeric' autoComplete='tel-national' pattern='\d{10}' title='10-digit mobile number' value={value.phoneNumber} onChange={digits('phoneNumber', 10)} />
            </Field>
            {onlyCountry ? (
                <p className='font-sans text-xs text-ink-faint sm:col-span-2'>Country: {onlyCountry.name}. We currently ship within India only.</p>
            ) : (
                <Field label='Country' className='sm:col-span-2'>
                    <select required autoComplete='country' value={value.country} onChange={e => { onChange('country', e.target.value); onChange('state', ''); }}>
                        {COUNTRIES.map(item => <option key={item.isoCode} value={item.isoCode}>{item.name}</option>)}
                    </select>
                </Field>
            )}
        </div>
    );
};

export default AddressFields;

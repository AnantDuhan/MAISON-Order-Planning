// We ship within India only (see the Shipping policy), so the address forms
// offer India and its states and union territories. ISO codes match what
// country-state-city used, so saved addresses keep working.

export const COUNTRIES = [{ isoCode: 'IN', name: 'India' }];

const IN_STATES = [
    { isoCode: 'AN', name: 'Andaman and Nicobar Islands' },
    { isoCode: 'AP', name: 'Andhra Pradesh' },
    { isoCode: 'AR', name: 'Arunachal Pradesh' },
    { isoCode: 'AS', name: 'Assam' },
    { isoCode: 'BR', name: 'Bihar' },
    { isoCode: 'CH', name: 'Chandigarh' },
    { isoCode: 'CT', name: 'Chhattisgarh' },
    { isoCode: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { isoCode: 'DL', name: 'Delhi' },
    { isoCode: 'GA', name: 'Goa' },
    { isoCode: 'GJ', name: 'Gujarat' },
    { isoCode: 'HR', name: 'Haryana' },
    { isoCode: 'HP', name: 'Himachal Pradesh' },
    { isoCode: 'JK', name: 'Jammu and Kashmir' },
    { isoCode: 'JH', name: 'Jharkhand' },
    { isoCode: 'KA', name: 'Karnataka' },
    { isoCode: 'KL', name: 'Kerala' },
    { isoCode: 'LA', name: 'Ladakh' },
    { isoCode: 'LD', name: 'Lakshadweep' },
    { isoCode: 'MP', name: 'Madhya Pradesh' },
    { isoCode: 'MH', name: 'Maharashtra' },
    { isoCode: 'MN', name: 'Manipur' },
    { isoCode: 'ML', name: 'Meghalaya' },
    { isoCode: 'MZ', name: 'Mizoram' },
    { isoCode: 'NL', name: 'Nagaland' },
    { isoCode: 'OR', name: 'Odisha' },
    { isoCode: 'PY', name: 'Puducherry' },
    { isoCode: 'PB', name: 'Punjab' },
    { isoCode: 'RJ', name: 'Rajasthan' },
    { isoCode: 'SK', name: 'Sikkim' },
    { isoCode: 'TN', name: 'Tamil Nadu' },
    { isoCode: 'TG', name: 'Telangana' },
    { isoCode: 'TR', name: 'Tripura' },
    { isoCode: 'UP', name: 'Uttar Pradesh' },
    { isoCode: 'UT', name: 'Uttarakhand' },
    { isoCode: 'WB', name: 'West Bengal' },
];

const IN_STATE_NAMES = Object.fromEntries(IN_STATES.map(s => [s.isoCode, s.name]));

export const statesOf = country => (country === 'IN' ? IN_STATES : []);

export const countryName = iso => (iso === 'IN' ? 'India' : iso);

export const stateName = (countryIso, stateIso) =>
    (countryIso === 'IN' && IN_STATE_NAMES[stateIso]) || stateIso;

/** "14, Race Course Road, Coimbatore, Tamil Nadu 641018, India" */
export const formatAddress = (a = {}) =>
    [a.address, a.city, [stateName(a.country, a.state), a.pinCode].filter(Boolean).join(' '), countryName(a.country)]
        .filter(Boolean)
        .join(', ');

import axios from 'axios';

// What each membership includes. Keep in step with backend/utils/membership.js
// (BENEFITS) and backend/utils/membershipPlans.js (prices come from the API).

export const RESTOCK_HEAD_START_HOURS = 6;
export const EARLY_ACCESS_HOURS = 48;

// Essential: three everyday perks. Plus: all of them, and four more.
const ESSENTIAL = [
    { title: 'Free shipping on every order', detail: 'No ₹150 charge, whatever the order size.' },
    { title: '14-day returns', detail: 'Twice the standard 7 days, for every order you place as a member.' },
    { title: 'Members-only coupons', detail: 'Offers only Essential and Plus members can use.' },
];

export const TIERS = {
    essential: {
        key: 'essential',
        name: 'Essential',
        pitch: 'Everyday perks for regular shoppers.',
        benefits: ESSENTIAL,
    },
    plus: {
        key: 'plus',
        name: 'Plus',
        pitch: 'Everything in Essential, plus first access and priority everything.',
        benefits: [
            { title: `${EARLY_ACCESS_HOURS}-hour early access`, detail: 'Buy selected new pieces before anyone else.' },
            { title: 'Back-in-stock first', detail: `Restock emails ${RESTOCK_HEAD_START_HOURS} hours before everyone else.` },
            { title: 'Priority dispatch', detail: 'Your orders are packed and shipped first.' },
            { title: 'Priority support', detail: 'Your messages go to the front of the queue.' },
            { title: 'Everything in Essential', detail: 'Free shipping on every order, 14-day returns and members-only coupons.' },
        ],
    },
};

export const tierName = tier => (TIERS[tier] ? `Maison ${TIERS[tier].name}` : null);

// The plan list (names, prices, plan ids) is the same for everyone and only
// changes on a deploy, so the store asks for it once per visit and every page
// that shows prices (home, membership) shares that answer.
let plansRequest = null;
export const loadMembershipPlans = () => {
    if (!plansRequest) {
        plansRequest = axios.get('/api/v1/membership/plans')
            .then(({ data }) => data?.plans || [])
            .catch(error => {
                plansRequest = null; // let the next page try again
                throw error;
            });
    }
    return plansRequest;
};

// What each membership includes. Keep in step with backend/utils/membership.js
// (BENEFITS) and backend/utils/membershipPlans.js (prices come from the API).

export const REWARD_RATE = 0.02;
export const REWARD_CAP = 500;
export const RESTOCK_HEAD_START_HOURS = 6;
export const EARLY_ACCESS_HOURS = 48;

const SHARED = [
    { title: 'Free shipping on every order', detail: 'No ₹150 charge, whatever the order size.' },
    { title: '14-day returns', detail: 'Twice the standard 7 days, for every order you place as a member.' },
    { title: 'Members-only coupons', detail: 'Offers only Essential and Plus members can use.' },
    { title: 'Priority dispatch', detail: 'Your orders are packed and shipped first.' },
    { title: 'Back-in-stock first', detail: `Restock emails ${RESTOCK_HEAD_START_HOURS} hours before everyone else.` },
    { title: 'Priority support', detail: 'Your messages go to the front of the queue.' },
];

export const TIERS = {
    essential: {
        key: 'essential',
        name: 'Essential',
        pitch: 'Everyday perks for regular shoppers.',
        benefits: SHARED,
    },
    plus: {
        key: 'plus',
        name: 'Plus',
        pitch: 'Everything in Essential, plus credit back and first access.',
        benefits: [
            { title: `${REWARD_RATE * 100}% back as store credit`, detail: `On every order, up to ₹${REWARD_CAP} each — added once the return window closes.` },
            { title: `${EARLY_ACCESS_HOURS}-hour early access`, detail: 'Buy selected new pieces before anyone else.' },
            { title: 'Everything in Essential', detail: 'Free shipping, 14-day returns, member coupons, priority dispatch and support, restock alerts first.' },
        ],
    },
};

export const tierName = tier => (TIERS[tier] ? `Maison ${TIERS[tier].name}` : null);

/** Plus credit an order earns (mirrors backend/services/memberRewards.js). */
export const rewardFor = order => {
    if (order?.memberTier !== 'plus') return 0;
    const base = Math.max(0, Number(order.totalPrice || 0) - Number(order.shippingPrice || 0));
    return Math.min(REWARD_CAP, Math.floor(base * REWARD_RATE));
};

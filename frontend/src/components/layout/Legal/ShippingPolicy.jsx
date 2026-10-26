import React from 'react';
import { Link } from 'react-router-dom';

import LegalPage, { LEGAL_EMAIL } from './LegalPage';

const link = 'underline underline-offset-2 text-ink';

const sections = [
    {
        heading: 'Where we deliver',
        body: ['We ship to addresses in India. Prices are in Indian Rupees (₹).'],
    },
    {
        heading: 'Shipping charges',
        body: [
            'Shipping is complimentary on orders over ₹1,000, and on every order for Maison Essential and Plus members. Members’ orders are dispatched first. Other orders of ₹1,000 or less carry a flat shipping charge of ₹150, shown in your cart and at checkout before you pay.',
        ],
    },
    {
        heading: 'Delivery times',
        body: [
            'Your estimated delivery date is shown when you place the order and in your confirmation email. Most orders arrive within about five days. Estimates are not guarantees: weather, holidays and courier delays can push them back.',
        ],
    },
    {
        heading: 'Tracking your order',
        body: [
            <>
                Once your order ships, its status and tracking details are updated on your{' '}
                <Link to='/orders' className={link}>
                    orders page
                </Link>
                .
            </>,
        ],
    },
    {
        heading: 'Damaged or missing items',
        body: [
            <>
                Please check your order when it arrives. If anything is damaged or missing, write to{' '}
                <a href={`mailto:${LEGAL_EMAIL}`} className={link}>
                    {LEGAL_EMAIL}
                </a>{' '}
                with your order ID and photos, or request a return from the order page. See our{' '}
                <Link to='/refund-policy' className={link}>
                    Refunds &amp; Cancellations policy
                </Link>
                .
            </>,
        ],
    },
];

const ShippingPolicy = () => (
    <LegalPage
        title='Shipping Policy'
        metaTitle='Shipping Policy · Maison'
        description='Where Maison delivers, what shipping costs, how long delivery takes and how to track your order.'
        intro='How we get your order to you: charges, delivery times and tracking.'
        sections={sections}
        lastUpdated='26 October 2026'
    />
);

export default ShippingPolicy;

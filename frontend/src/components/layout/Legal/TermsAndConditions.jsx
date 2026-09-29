import React from 'react';
import { Link } from 'react-router-dom';

import LegalPage from './LegalPage';

const sections = [
    {
        heading: 'Using Maison',
        body: [
            'By creating an account or placing an order you agree to these terms. You must be at least 18 years old, give accurate information, and keep your login details private. You are responsible for activity on your account.',
            'Do not misuse the site — for example by scraping it, attempting to break its security, or placing fraudulent orders. We may suspend accounts that do.',
        ],
    },
    {
        heading: 'Products and pricing',
        body: [
            'We try to describe and photograph every piece accurately, but colours and finishes can vary slightly between screens. Prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise.',
            'If an item is listed at an obviously wrong price or becomes unavailable, we may cancel the order and refund you in full.',
        ],
    },
    {
        heading: 'Orders and payment',
        body: [
            'An order is confirmed once payment succeeds and you receive a confirmation email. Payments are processed securely by Cashfree. Coupons and membership benefits are subject to their own stated conditions and cannot be exchanged for cash.',
        ],
    },
    {
        heading: 'Shipping and delivery',
        body: [
            'Delivery estimates shown at checkout are estimates, not guarantees. Please check your order on arrival and report any damage as soon as possible.',
        ],
    },
    {
        heading: 'Returns and refunds',
        body: [
            'Eligible orders can be returned by requesting a return from the order page in your account within the window shown there. Approved refunds go back to the original payment method; your bank may take a few working days to credit it.',
        ],
    },
    {
        heading: 'Membership',
        body: [
            'Maison Plus membership benefits, price and duration are shown on the membership page at the time you join. Membership is personal to your account and is not transferable.',
        ],
    },
    {
        heading: 'Reviews and content',
        body: [
            'Reviews you post must be honest and lawful. By posting, you let us display them on the site. We may remove reviews that are abusive, misleading or off-topic.',
        ],
    },
    {
        heading: 'Intellectual property',
        body: ['The Maison name, design, text and images on this site belong to us or our licensors and may not be copied without permission.'],
    },
    {
        heading: 'Liability',
        body: [
            'To the extent the law allows, our liability for any order is limited to the amount you paid for it. Nothing in these terms limits your rights as a consumer under Indian law.',
        ],
    },
    {
        heading: 'Governing law',
        body: ['These terms are governed by the laws of India, and disputes are subject to the courts of Coimbatore, Tamil Nadu.'],
    },
    {
        heading: 'Changes',
        body: [
            <>
                We may update these terms from time to time; the date above shows the latest version. See also our{' '}
                <Link to='/privacy' className='underline underline-offset-2 text-ink'>
                    Privacy Policy
                </Link>
                .
            </>,
        ],
    },
];

const TermsAndConditions = () => (
    <LegalPage
        title='Terms & Conditions'
        metaTitle='Terms & Conditions · Maison'
        description='The terms that apply when you shop at Maison — orders, payment, delivery, returns and membership.'
        intro='These terms apply to your use of the Maison website and any order you place with us. Please read them carefully.'
        sections={sections}
    />
);

export default TermsAndConditions;

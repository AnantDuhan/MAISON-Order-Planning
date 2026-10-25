import React from 'react';
import { Link } from 'react-router-dom';

import LegalPage, { LEGAL_EMAIL } from './LegalPage';

const link = 'underline underline-offset-2 text-ink';

const sections = [
    {
        heading: 'Cancelling an order',
        body: [
            <>
                To cancel an order before it ships, write to{' '}
                <a href={`mailto:${LEGAL_EMAIL}`} className={link}>
                    {LEGAL_EMAIL}
                </a>{' '}
                with your order ID as soon as possible. If it has not been dispatched, we will cancel it and refund
                you in full. Once an order has shipped it can no longer be cancelled, but you can return it after
                delivery.
            </>,
        ],
    },
    {
        heading: 'Requesting a return',
        body: [
            <>
                Once your order is marked delivered, open it from your{' '}
                <Link to='/orders' className={link}>
                    orders page
                </Link>
                , choose “Request a return” and tell us the reason. You can request a return within 7 days of
                delivery; the order page shows the last date for your order. A return request covers the whole order.
            </>,
            'Please send items back unused and in their original packaging, with all accessories included.',
        ],
    },
    {
        heading: 'Refunds',
        body: [
            'When a return is approved, we refund the full amount you paid for the order to your original payment method. Your bank may take a few working days to show the credit.',
            'You can follow the status of a return and its refund on the order page.',
        ],
    },
    {
        heading: 'Damaged, defective or wrong items',
        body: [
            'If something arrives damaged, defective or different from what you ordered, contact us with your order ID and photos and we will put it right with a replacement or a full refund.',
        ],
    },
    {
        heading: 'Membership',
        body: [
            <>
                Maison Plus is billed through Cashfree and can be cancelled from the{' '}
                <Link to='/membership' className={link}>
                    membership page
                </Link>
                . Cancelling stops future charges; payments already taken for the current period are not refunded.
            </>,
        ],
    },
];

const RefundPolicy = () => (
    <LegalPage
        title='Refunds & Cancellations'
        metaTitle='Refunds & Cancellations · Maison'
        description='How to cancel a Maison order, request a return and get your refund.'
        intro='How cancellations, returns and refunds work at Maison.'
        sections={sections}
        lastUpdated='25 October 2026'
    />
);

export default RefundPolicy;

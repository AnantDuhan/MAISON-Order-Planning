import React from 'react';

import LegalPage, { LEGAL_EMAIL } from './LegalPage';

const openCookieSettings = () => window.dispatchEvent(new Event('open-cookie-settings'));

const sections = [
    {
        heading: 'Information we collect',
        body: [
            'Account details: your name, email address, WhatsApp number and a securely hashed password — or your Google profile name, email and picture if you sign in with Google.',
            'Order details: shipping addresses, items purchased, order history, returns and refunds, and any product reviews you write.',
            'Payment details are entered on Cashfree’s secure checkout. We never see or store your full card or UPI credentials; we only receive a payment reference and status.',
            'Messages you send through our contact form, newsletter sign-ups, and (if you enable them) two-factor authentication settings and push-notification tokens.',
            'Sign-in data: if you sign in with a one-time code, we briefly store a scrambled (hashed) copy of the code for up to 10 minutes. If you add a passkey, we store only its public key and a device name — your fingerprint, face or PIN never leaves your device.',
            'Technical data such as your IP address, browser type and pages visited, used for security, rate-limiting and — only if you accept analytics cookies — anonymised usage statistics.',
        ],
    },
    {
        heading: 'How we use it',
        body: [
            'To create and secure your account, process and deliver orders, handle returns and refunds, send order and account emails, respond to your messages, prevent fraud and abuse, and improve the store.',
            'We send marketing emails (such as the weekly newsletter or wishlist reminders) only if you subscribe, and every such email lets you unsubscribe.',
        ],
    },
    {
        heading: 'Cookies and local storage',
        body: [
            'Essential: a secure, http-only login cookie keeps you signed in; your cart, shipping details and theme preference are kept in your browser’s local storage. These are required for the store to work.',
            'Analytics (optional): Google Analytics cookies, loaded only after you choose “Accept all”. You can change your choice at any time.',
            <button key='cs' type='button' onClick={openCookieSettings} className='underline underline-offset-2 text-ink'>
                Open cookie settings
            </button>,
        ],
    },
    {
        heading: 'Who we share it with',
        body: [
            'We do not sell your personal data. We share only what is needed with service providers that run the store: Cashfree (payments), Resend (transactional email), our SMS provider (to deliver sign-in codes to your mobile number), Google (sign-in and, with consent, analytics), MongoDB Atlas (database), Amazon Web Services (image storage) and Render (hosting). Some of these providers process data outside India.',
            'We may disclose information if required by law or to protect our users and the store.',
        ],
    },
    {
        heading: 'How long we keep it',
        body: [
            'Account data is kept while your account is active. Order and payment records are kept as long as tax and accounting law requires. Contact-form messages are deleted once they are no longer needed.',
        ],
    },
    {
        heading: 'Your rights',
        body: [
            'You can view and update your profile and addresses from your account. You may also ask us to access, correct or delete your personal data, or withdraw consent, including under India’s Digital Personal Data Protection Act, 2023.',
            `Email ${LEGAL_EMAIL} and we will respond within 30 days.`,
        ],
    },
    {
        heading: 'Security',
        body: [
            'Passwords are hashed, traffic is encrypted over HTTPS, and optional two-factor authentication is available. No system is perfectly secure, so please use a strong, unique password.',
        ],
    },
    {
        heading: 'Children',
        body: ['Maison is not intended for anyone under 18, and we do not knowingly collect their data.'],
    },
    {
        heading: 'Changes to this policy',
        body: ['We will post any changes here and update the date above. Significant changes will be announced by email or on the site.'],
    },
];

const PrivacyPolicy = () => (
    <LegalPage
        title='Privacy Policy'
        metaTitle='Privacy Policy · Maison'
        description='How Maison collects, uses and protects your personal information, and the choices you have.'
        intro='This policy explains what personal information Maison (“we”, “us”) collects when you use this website, why we collect it, and the choices you have.'
        sections={sections}
    />
);

export default PrivacyPolicy;

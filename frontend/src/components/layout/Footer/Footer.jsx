import React from 'react';
import { Link } from 'react-router-dom';

const columns = [
    {
        title: 'Explore',
        links: [
            { label: 'Shop All', to: '/products' },
            { label: 'Wishlist', to: '/wishlist' },
            { label: 'My Orders', to: '/orders' },
            { label: 'Membership', to: '/membership' },
        ],
    },
    {
        title: 'Maison',
        links: [
            { label: 'About', to: '/about' },
            { label: 'Contact', to: '/contact-us' },
            { label: 'My Account', to: '/account' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Shipping Policy', to: '/shipping-policy' },
            { label: 'Refunds & Cancellations', to: '/refund-policy' },
            { label: 'Terms & Conditions', to: '/terms' },
        ],
    },
];

const socials = [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/anantduhan' },
    { label: 'GitHub', href: 'https://github.com/AnantDuhan' },
];

const Footer = () => {
    return (
        <footer className='mt-24 border-t border-line bg-surface'>
            <div className='mx-auto max-w-editorial px-6 py-16 lg:px-12'>
                <div className='grid gap-12 md:grid-cols-2 lg:grid-cols-4'>
                    {/* Brand */}
                    <div className='lg:col-span-2'>
                        <p className='font-display text-3xl font-medium tracking-[0.18em] text-ink'>MAISON</p>
                        <p className='mt-6 max-w-sm font-display text-xl font-light italic leading-relaxed text-ink-soft'>
                            Everyday objects, chosen with intention and made to be kept.
                        </p>
                    </div>

                    {/* Link columns */}
                    {columns.map(col => (
                        <div key={col.title}>
                            <h4 className='eyebrow'>{col.title}</h4>
                            <ul className='mt-5 flex flex-col gap-3'>
                                {col.links.map(l => (
                                    <li key={l.label}>
                                        <Link to={l.to} className='link-reveal font-sans text-sm'>
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className='mt-14 rule-luxe' />

                <div className='mt-8 flex flex-col items-center justify-between gap-6 sm:flex-row'>
                    <p className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint'>
                        © {new Date().getFullYear()} Maison · All rights reserved
                        {' · '}
                        <button
                            type='button'
                            onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
                            className='link-reveal uppercase'
                        >
                            Cookie settings
                        </button>
                    </p>
                    <div className='flex items-center gap-6'>
                        {socials.map(s => (
                            <a
                                key={s.label}
                                href={s.href}
                                target='_blank'
                                rel='noreferrer'
                                className='link-reveal font-sans text-[0.72rem] uppercase tracking-luxe'
                            >
                                {s.label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

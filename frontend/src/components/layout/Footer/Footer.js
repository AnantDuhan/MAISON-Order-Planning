import React from 'react';
import { Link } from 'react-router-dom';

const columns = [
    {
        title: 'Explore',
        links: [
            { label: 'Shop All', to: '/products' },
            { label: 'New Arrivals', to: '/products' },
            { label: 'Wishlist', to: '/wishlist' },
            { label: 'My Orders', to: '/orders' },
        ],
    },
    {
        title: 'Maison',
        links: [
            { label: 'About', to: '/about' },
            { label: 'Contact', to: '/contact-us' },
            { label: 'My Account', to: '/account' },
        ],
    },
];

const socials = [
    { label: 'Instagram', href: 'http://instagram.com/anantduhan_' },
    { label: 'Facebook', href: 'http://facebook.com/AnantDuhan12' },
    { label: 'Snapchat', href: 'http://snapchat.com/add/anant_duhan' },
];

const Footer = () => {
    return (
        <footer className='mt-24 border-t border-line bg-surface'>
            <div className='mx-auto max-w-editorial px-6 py-16 lg:px-12'>
                <div className='grid gap-12 md:grid-cols-2 lg:grid-cols-4'>
                    {/* Brand */}
                    <div className='lg:col-span-2'>
                        <p className='font-display text-3xl font-medium tracking-wide text-ink'>MAISON</p>
                        <p className='mt-1 font-sans text-[0.6rem] uppercase tracking-wide2 text-brass'>
                            Order Planning
                        </p>
                        <p className='mt-6 max-w-sm font-display text-xl font-light italic leading-relaxed text-ink-soft'>
                            “High quality is our first priority — objects chosen with intention, made to be kept.”
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
                        © {new Date().getFullYear()} Anant Duhan · All rights reserved
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

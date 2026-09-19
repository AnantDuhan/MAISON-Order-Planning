import React from 'react';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

import MetaData from '../MetaData';

const socials = [
    { icon: <YouTubeIcon />, href: 'https://www.youtube.com/channel/AnantDuhan', label: 'YouTube' },
    { icon: <InstagramIcon />, href: 'https://instagram.com/anantduhan_', label: 'Instagram' },
    { icon: <FacebookIcon />, href: 'https://facebook.com/anantduhan12', label: 'Facebook' },
    { icon: <LinkedInIcon />, href: 'https://www.linkedin.com/in/anantduhan/', label: 'LinkedIn' },
];

const platformCapabilities = [
    ['User Authentication & Authorization', 'Secure authentication, role-based access control, and two-factor authentication (2FA).'],
    ['Product Management', 'Product catalogue, categories, inventory, reviews, and product search.'],
    ['Shopping Experience', 'Cart, wishlist, coupons, memberships, and order management.'],
    ['Payments', 'Secure payment processing through Stripe.'],
    ['Order & Return Management', 'Order tracking, returns, refunds, and customer workflows.'],
    ['Admin Dashboard', 'Business analytics for revenue, orders, products, inventory, returns, coupons, memberships, and 2FA adoption.'],
    ['Real-Time Features', 'Socket.IO with Redis-based Pub/Sub for scalable real-time communication.'],
    ['Caching & Rate Limiting', 'Redis-based performance improvements and API protection.'],
    ['Search & Analytics', 'Elasticsearch integration for efficient product search and data analysis.'],
    ['Cloud Storage', 'AWS S3 for product and media storage.'],
    ['Responsive Interface', 'React.js, Tailwind CSS, and a TypeScript-based frontend experience.'],
];

const technology = [
    ['Frontend', 'React.js, TypeScript, Tailwind CSS'],
    ['Backend', 'Node.js, Express.js'],
    ['Database', 'MongoDB'],
    ['Caching & Real-Time Scaling', 'Redis, Socket.IO'],
    ['Search', 'Elasticsearch'],
    ['Payments', 'Stripe'],
    ['Storage', 'AWS S3'],
    ['Deployment', 'Netlify, Render'],
];

const About = () => {
    return (
        <div className='editorial-shell py-16'>
            <MetaData title='About · Order Planning' />

            {/* Masthead */}
            <div className='mx-auto max-w-3xl text-center'>
                <p className='eyebrow'>The Platform</p>
                <h1 className='heading-display mt-4 text-display-lg'>Order Planning</h1>
                <p className='mx-auto mt-6 max-w-xl font-display text-2xl font-light italic leading-relaxed text-ink-soft'>
                    A modern MERN stack e-commerce platform built for secure, scalable, and seamless shopping.
                </p>
            </div>

            <div className='mt-16 rule-luxe' />

            {/* Founder */}
            <div className='mt-16 grid items-center gap-14 md:grid-cols-[300px_1fr]'>
                <div className='flex justify-center'>
                    <img
                        src='https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/Profile+OP.jpeg'
                        alt='Founder'
                        className='h-64 w-64 rounded-full border border-line object-cover'
                    />
                </div>

                <div>
                    <p className='eyebrow'>Built By</p>
                    <h2 className='heading-display mt-3 text-display'>Anant Duhan</h2>
                    <p className='mt-6 max-w-xl font-sans text-base leading-relaxed text-ink-soft'>
                        <strong className='font-semibold text-ink'>Order Planning</strong> is a production-oriented MERN stack e-commerce platform built by{' '}
                        <a
                            href='https://www.linkedin.com/in/anantduhan/'
                            target='_blank'
                            rel='noreferrer'
                            className='text-brass underline-offset-4 hover:underline'
                        >
                            Anant Duhan
                        </a>
                        , a <strong className='font-semibold text-ink'>Software Engineer and Full Stack Developer</strong>. It brings a complete shopping experience together with a secure and scalable backend.
                    </p>

                    <a
                        href='https://www.linkedin.com/in/anantduhan/'
                        target='_blank'
                        rel='noreferrer'
                        className='btn-outline mt-8 inline-flex'
                    >
                        Visit LinkedIn
                    </a>
                </div>
            </div>

            {/* Platform capabilities */}
            <section className='mt-24'>
                <div className='mx-auto max-w-2xl text-center'>
                    <p className='eyebrow'>What Order Planning Includes</p>
                    <h2 className='heading-display mt-3 text-display'>Built for the full commerce journey</h2>
                </div>
                <div className='mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3'>
                    {platformCapabilities.map(([title, description]) => (
                        <article key={title} className='bg-surface p-6'>
                            <h3 className='font-display text-2xl text-ink'>{title}</h3>
                            <p className='mt-3 font-sans text-sm leading-6 text-ink-soft'>{description}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* Technology */}
            <section className='mt-24 border-y border-line py-16'>
                <div className='mx-auto max-w-2xl text-center'>
                    <p className='eyebrow'>Technology</p>
                    <h2 className='heading-display mt-3 text-display'>A modern, scalable stack</h2>
                </div>
                <dl className='mx-auto mt-12 grid max-w-4xl gap-x-12 gap-y-8 sm:grid-cols-2'>
                    {technology.map(([name, value]) => (
                        <div key={name} className='border-b border-line pb-5'>
                            <dt className='eyebrow'>{name}</dt>
                            <dd className='mt-2 font-sans text-sm leading-6 text-ink-soft'>{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Connect */}
            <div className='mt-24 text-center'>
                <p className='eyebrow'>Elsewhere</p>
                <h2 className='heading-display mt-3 text-display'>Connect with Anant</h2>
                <div className='mt-10 flex items-center justify-center gap-8'>
                    {socials.map(s => (
                        <a
                            key={s.label}
                            href={s.href}
                            target='_blank'
                            rel='noreferrer'
                            aria-label={s.label}
                            className='grid h-14 w-14 place-items-center rounded-full border border-line text-ink-soft transition-all duration-500 ease-luxe hover:border-brass hover:text-brass'
                        >
                            {s.icon}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default About;

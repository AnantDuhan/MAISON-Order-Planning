import React from 'react';
import { Link } from 'react-router-dom';

import MetaData from '../MetaData';
import { LEGAL_EMAIL } from '../Legal/LegalPage';
import { formatINR } from '../../../utils/priceLabel';
import { DELIVERY_ESTIMATE_DAYS, FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from '../../../utils/delivery';
import { MEMBER_RETURN_WINDOW_DAYS, RETURN_WINDOW_DAYS } from '../../../utils/returnWindow';
import { useCategories } from '../../../utils/useCategories';

const Icon = ({ children }) => (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.4' aria-hidden='true' className='shrink-0 text-brass'>
        {children}
    </svg>
);

const principles = [
    {
        title: 'Fewer, better',
        body: "The range is short on purpose. If we wouldn't reach for something every day, it doesn't make the cut, so there's nothing here to wade through.",
    },
    {
        title: 'Made to be kept',
        body: "We look for good materials, honest build and brands that stand behind what they make. One thing that lasts beats three that don't.",
    },
    {
        title: 'Plain dealing',
        body: "Clear prices, simple returns and a secure checkout. If something isn't right when it arrives, you can send it back.",
    },
];

const promises = [
    {
        icon: <><path d='M3 7h11v9H3zM14 10h4l3 3v3h-7' /><circle cx='7' cy='17.5' r='1.5' /><circle cx='17' cy='17.5' r='1.5' /></>,
        title: `Free shipping over ${formatINR(FREE_SHIPPING_THRESHOLD)}`,
        body: 'And on every order for members.',
    },
    {
        icon: <><path d='M4 12a8 8 0 1 0 3-6.2' /><path d='M4 4v4h4' /></>,
        title: `${RETURN_WINDOW_DAYS}-day returns`,
        body: `${MEMBER_RETURN_WINDOW_DAYS} days for members, counted from delivery.`,
    },
    {
        icon: <><rect x='5' y='10' width='14' height='10' /><path d='M8 10V7a4 4 0 0 1 8 0v3' /></>,
        title: 'Secure checkout',
        body: 'Payments are handled by Cashfree.',
    },
    {
        icon: <><path d='M6 3h9l3 3v15H6z' /><path d='M9 9h6M9 13h6M9 17h3' /></>,
        title: 'An invoice you can verify',
        body: <>Every order comes with an invoice you can <Link to='/verify' className='text-brass underline-offset-4 hover:underline'>check online</Link>.</>,
    },
];

// Answers mirror the Shipping and Refunds policies and the values checkout
// uses, so change those (not this copy) when a policy changes.
const A = ({ to, children }) => (
    <Link to={to} className='text-brass underline-offset-4 hover:underline'>{children}</Link>
);
const Mail = () => (
    <a href={`mailto:${LEGAL_EMAIL}`} className='text-brass underline-offset-4 hover:underline'>{LEGAL_EMAIL}</a>
);

const faqs = [
    {
        q: 'Where do you deliver?',
        a: <>Anywhere in India. All prices are in Indian Rupees (₹).</>,
    },
    {
        q: 'How much does shipping cost?',
        a: <>
            Shipping is free on orders over {formatINR(FREE_SHIPPING_THRESHOLD)}, and on every order for members. Orders
            of {formatINR(FREE_SHIPPING_THRESHOLD)} or less carry a flat {formatINR(SHIPPING_CHARGE)}, shown in your cart
            before you pay.
        </>,
    },
    {
        q: 'How long will my order take?',
        a: <>
            Most orders arrive within about {DELIVERY_ESTIMATE_DAYS} days. You'll see an estimated date at checkout and in
            your confirmation email, and once the order ships you can follow it from <A to='/orders'>your orders</A>.
        </>,
    },
    {
        q: 'Can I cancel an order?',
        a: <>
            Yes, until it ships. Write to <Mail /> with your order ID and we'll cancel it and refund you in full. Once it
            has shipped it can't be cancelled, but you can return it after delivery.
        </>,
    },
    {
        q: 'How do returns and refunds work?',
        a: <>
            Open the order from <A to='/orders'>your orders</A> and choose "Request a return" within {RETURN_WINDOW_DAYS}{' '}
            days of delivery ({MEMBER_RETURN_WINDOW_DAYS} for members). Send items back unused, in their original
            packaging. Once the return is approved, the full amount goes back to your original payment method.
        </>,
    },
    {
        q: 'Something arrived damaged or wrong. What now?',
        a: <>
            Email <Mail /> with your order ID and a few photos, and we'll send a replacement or refund you in full.
        </>,
    },
    {
        q: 'How do I pay?',
        a: <>Online at checkout. Payments are processed securely by Cashfree.</>,
    },
    {
        q: 'What does membership include?',
        a: <>
            Essential gives you free shipping on every order, {MEMBER_RETURN_WINDOW_DAYS}-day returns and members-only
            offers. Plus adds priority dispatch and support, first word on restocks and 48-hour early access to new
            pieces. You can cancel any time from the <A to='/membership'>membership page</A>.
        </>,
    },
];

/** Department photos for the masthead collage, or nothing if fewer than three. */
const Collage = ({ departments }) => {
    const tiles = departments.filter(d => d.displayImage).slice(0, 3);
    if (tiles.length < 3) {
        return (
            <div className='grid aspect-[4/5] w-full place-items-center bg-surface-2'>
                <span className='font-display text-[9rem] font-light leading-none text-brass/70 sm:text-[12rem]'>M</span>
            </div>
        );
    }
    return (
        <div className='grid aspect-[4/5] w-full grid-cols-2 grid-rows-2 gap-3 sm:aspect-[5/5]'>
            {tiles.map((d, i) => (
                <Link
                    key={d._id}
                    to={`/products?category=${encodeURIComponent(d.slug)}`}
                    className={`group relative overflow-hidden bg-[#F1EEE9] ${i === 0 ? 'row-span-2' : ''}`}
                    aria-label={`Shop ${d.name}`}
                >
                    <img
                        src={d.displayImage}
                        alt=''
                        decoding='async'
                        className='h-full w-full object-contain p-5 mix-blend-multiply transition-transform duration-700 ease-luxe group-hover:scale-105'
                    />
                    <span className='absolute bottom-0 left-0 bg-canvas/90 px-3 py-1.5 font-sans text-[0.68rem] uppercase tracking-luxe text-ink backdrop-blur'>
                        {d.name}
                    </span>
                </Link>
            ))}
        </div>
    );
};

const About = () => {
    const { categories, loading } = useCategories();
    const departments = categories.filter(d => !d.parent);

    return (
        <div className='pb-24'>
            <MetaData title='About · Maison' />

            {/* Masthead */}
            <section className='editorial-shell pt-10 sm:pt-16'>
                <div className='flex flex-wrap items-center gap-12 lg:gap-16'>
                    <div className='min-w-0 flex-[1_1_420px] animate-fade-up'>
                        <p className='eyebrow'>About Maison</p>
                        <h1 className='heading-display mt-5 text-display-lg'>A small house of everyday objects.</h1>
                        <p className='mt-7 max-w-lg font-sans text-base leading-relaxed text-ink-soft sm:text-lg'>
                            Maison is an online store for the things you use every day: tech, clothing, shoes, accessories and pieces
                            for the home. Each one is chosen to be used daily and kept for years.
                        </p>
                        <div className='mt-9 flex flex-wrap gap-3'>
                            <Link to='/products' className='btn-solid'>Shop the collection</Link>
                            <a href='#principles' className='btn-outline'>How we choose</a>
                        </div>
                    </div>
                    <div className='min-w-0 flex-[1_1_380px] animate-fade-in'>
                        <Collage departments={departments} />
                    </div>
                </div>
            </section>

            {/* Statement */}
            <section className='editorial-shell mt-24 sm:mt-32'>
                <div className='rule-luxe' />
                <p className='mx-auto mt-14 max-w-4xl text-center font-display text-3xl font-light leading-snug text-ink sm:text-[2.6rem] sm:leading-[1.2]'>
                    The headphones on your desk, the shirt you wear most, the shoes you walk in, the small things you carry and the
                    objects that make a room feel like yours. <span className='italic text-brass'>That's the whole idea.</span>
                </p>
            </section>

            {/* Principles */}
            <section id='principles' className='editorial-shell mt-24 scroll-mt-28 sm:mt-32'>
                <div className='flex flex-wrap items-end justify-between gap-4'>
                    <div>
                        <p className='eyebrow'>How we choose</p>
                        <h2 className='heading-display mt-3 text-4xl sm:text-5xl'>Three rules, kept simple.</h2>
                    </div>
                </div>
                <ol className='mt-12 grid gap-px border border-line bg-line md:grid-cols-3'>
                    {principles.map((p, i) => (
                        <li key={p.title} className='flex flex-col bg-surface p-8 sm:p-10'>
                            <span className='font-display text-6xl font-light leading-none text-brass/80'>{String(i + 1).padStart(2, '0')}</span>
                            <h3 className='mt-8 font-display text-3xl text-ink'>{p.title}</h3>
                            <p className='mt-4 font-sans text-sm leading-7 text-ink-soft'>{p.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* What you'll find, from Admin > Categories */}
            {(loading || departments.length > 0) && (
                <section className='editorial-shell mt-24 sm:mt-32'>
                    <div className='flex flex-wrap items-end justify-between gap-4'>
                        <div>
                            <p className='eyebrow'>The departments</p>
                            <h2 className='heading-display mt-3 text-4xl sm:text-5xl'>What you'll find here</h2>
                        </div>
                        <Link to='/products' className='link-reveal font-sans text-xs uppercase tracking-luxe sm:text-sm'>Shop all</Link>
                    </div>
                    <ul className='mt-10 border-t border-line'>
                        {departments.map((d, i) => {
                            const live = d.productCount > 0;
                            const row = (
                                <div className='flex items-center gap-5 py-6 sm:gap-8'>
                                    <span className='hidden w-8 shrink-0 font-sans text-xs tracking-luxe text-ink-faint sm:block'>{String(i + 1).padStart(2, '0')}</span>
                                    <div className='h-16 w-16 shrink-0 overflow-hidden bg-[#F1EEE9] sm:h-20 sm:w-20'>
                                        {d.displayImage && <img src={d.displayImage} alt='' loading='lazy' decoding='async' className='h-full w-full object-contain p-1.5 mix-blend-multiply' />}
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className={`font-display text-2xl transition-colors duration-300 group-hover:text-brass sm:text-3xl ${live ? 'text-ink' : 'text-ink-faint'}`}>{d.name}</p>
                                        {d.description && <p className='mt-1 line-clamp-1 font-sans text-sm text-ink-soft'>{d.description}</p>}
                                    </div>
                                    <span className='hidden shrink-0 font-sans text-xs text-ink-faint sm:block'>
                                        {live ? `${d.productCount} ${d.productCount === 1 ? 'piece' : 'pieces'}` : 'Arriving soon'}
                                    </span>
                                    <span aria-hidden='true' className={`shrink-0 font-sans text-lg transition-transform duration-500 ease-luxe ${live ? 'text-ink group-hover:translate-x-1 group-hover:text-brass' : 'text-line'}`}>→</span>
                                </div>
                            );
                            return (
                                <li key={d._id} className='border-b border-line'>
                                    {live
                                        ? <Link to={`/products?category=${encodeURIComponent(d.slug)}`} className='group block'>{row}</Link>
                                        : <div>{row}</div>}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* The name */}
            <section className='editorial-shell mt-24 sm:mt-32'>
                <div className='flex flex-wrap bg-surface-2'>
                    <div className='flex min-w-0 flex-[1_1_380px] flex-col justify-center px-6 py-14 sm:px-12 sm:py-20'>
                        <p className='font-display text-7xl font-light leading-none text-ink sm:text-8xl'>maison</p>
                        <p className='mt-4 font-sans text-sm text-ink-faint'>
                            /mɛ.zɔ̃/ <span className='mx-2 text-line'>|</span> <span className='italic'>noun, French</span>
                        </p>
                        <p className='mt-2 font-display text-2xl italic text-brass'>house; home.</p>
                    </div>
                    <div className='flex min-w-0 flex-[1_1_420px] flex-col justify-center border-t border-line px-6 py-12 sm:px-12 sm:py-16 md:border-l md:border-t-0'>
                        <p className='eyebrow'>Why the name</p>
                        <p className='mt-5 max-w-lg font-sans text-base leading-relaxed text-ink-soft'>
                            We wanted the store to feel like a well-kept home rather than a warehouse: a few good things, each in its place,
                            easy to find and easy to live with. The name was the shortest way to say it.
                        </p>
                    </div>
                </div>
            </section>

            {/* Shopping with Maison */}
            <section className='editorial-shell mt-24 sm:mt-32'>
                <p className='eyebrow'>Shopping with Maison</p>
                <h2 className='heading-display mt-3 text-4xl sm:text-5xl'>What you can count on</h2>
                <ul className='mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4'>
                    {promises.map(p => (
                        <li key={p.title} className='border-t border-line pt-6'>
                            <Icon>{p.icon}</Icon>
                            <h3 className='mt-5 font-display text-2xl text-ink'>{p.title}</h3>
                            <p className='mt-2 font-sans text-sm leading-6 text-ink-soft'>{p.body}</p>
                        </li>
                    ))}
                </ul>
            </section>

            {/* FAQs */}
            <section id='faq' className='editorial-shell mt-24 scroll-mt-28 sm:mt-32'>
                <div className='flex flex-wrap gap-x-16 gap-y-10'>
                    <div className='min-w-0 flex-[1_1_280px] lg:max-w-sm'>
                        <div className='lg:sticky lg:top-28'>
                            <p className='eyebrow'>Questions</p>
                            <h2 className='heading-display mt-3 text-4xl sm:text-5xl'>Good to know</h2>
                            <p className='mt-5 font-sans text-sm leading-6 text-ink-soft'>
                                The short answers. For the details, read our <A to='/shipping-policy'>shipping</A> and{' '}
                                <A to='/refund-policy'>refunds</A> policies, or <A to='/contact-us'>get in touch</A>.
                            </p>
                        </div>
                    </div>
                    <div className='min-w-0 flex-[2_1_480px] border-t border-line'>
                        {faqs.map(f => (
                            <details key={f.q} name='maison-faq' className='group border-b border-line'>
                                <summary className='flex cursor-pointer list-none items-center justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden'>
                                    <span className='font-display text-2xl text-ink transition-colors duration-300 group-hover:text-brass group-open:text-brass'>{f.q}</span>
                                    <span aria-hidden='true' className='relative h-4 w-4 shrink-0'>
                                        <span className='absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-ink' />
                                        <span className='absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-ink transition-transform duration-500 ease-luxe group-open:rotate-90 group-open:opacity-0' />
                                    </span>
                                </summary>
                                <p className='max-w-2xl pb-7 pr-10 font-sans text-sm leading-7 text-ink-soft'>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* Membership */}
            <section className='editorial-shell mt-24 sm:mt-32'>
                <div className='flex flex-wrap items-center justify-between gap-8 bg-ink px-6 py-12 sm:px-12 sm:py-14'>
                    <div className='min-w-0 flex-[1_1_420px]'>
                        <p className='font-sans text-xs uppercase tracking-luxe text-brass-soft'>Maison Membership</p>
                        <h2 className='mt-3 font-display text-3xl font-normal leading-tight text-canvas sm:text-4xl'>
                            Shop with us often? Members get free shipping on every order, {MEMBER_RETURN_WINDOW_DAYS}-day returns and members-only offers.
                        </h2>
                    </div>
                    <Link to='/membership' className='btn-luxe shrink-0 bg-canvas px-7 py-4 text-ink hover:bg-brass hover:text-white'>
                        See membership
                    </Link>
                </div>
            </section>

            {/* Contact + credit */}
            <section className='editorial-shell mt-24 sm:mt-28'>
                <div className='flex flex-wrap items-end justify-between gap-8 border-t border-line pt-10'>
                    <div>
                        <h2 className='heading-display text-4xl'>Questions about an order or a piece?</h2>
                        <Link to='/contact-us' className='link-reveal mt-4 inline-block font-sans text-xs uppercase tracking-luxe sm:text-sm'>Get in touch</Link>
                    </div>
                    <p className='font-sans text-xs text-ink-faint'>
                        Designed and built by{' '}
                        <a href='https://www.linkedin.com/in/anantduhan/' target='_blank' rel='noreferrer' className='text-ink-soft underline-offset-4 hover:text-brass hover:underline'>
                            Anant Duhan
                        </a>
                        <span className='mx-2 text-line'>·</span>
                        <a href='https://github.com/AnantDuhan/MAISON-Order-Planning' target='_blank' rel='noreferrer' className='text-ink-soft underline-offset-4 hover:text-brass hover:underline'>
                            Source on GitHub
                        </a>
                    </p>
                </div>
            </section>
        </div>
    );
};

export default About;

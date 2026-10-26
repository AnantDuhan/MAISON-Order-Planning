import axios from 'axios';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, getProduct } from '../../actions/productAction';
import { clearNewsletter, newsletter } from '../../actions/subscribeAction';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';
import ProductCard from './ProductCard';
import { useFeature } from '../../context/FeatureFlagsContext';
import { formatINR, priceLabel } from '../../utils/priceLabel';
import { FREE_SHIPPING_THRESHOLD } from '../../utils/delivery';
import { MEMBER_RETURN_WINDOW_DAYS, RETURN_WINDOW_DAYS } from '../../utils/returnWindow';
import { useCategories } from '../../utils/useCategories';

const FALLBACK_ESSENTIAL_PRICE = 600; // per year

const firstImage = product => (product?.images || []).find(img => img?.url)?.url || null;

const Icon = ({ children }) => (
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' aria-hidden='true' className='shrink-0 text-brass'>
        {children}
    </svg>
);

/** Cheapest membership (Essential, yearly) from the plans API, with a fallback. */
const useEntryPrice = () => {
    const [price, setPrice] = useState(FALLBACK_ESSENTIAL_PRICE);
    useEffect(() => {
        let alive = true;
        axios.get('/api/v1/membership/plans')
            .then(({ data }) => {
                const essential = (data.plans || []).find(p => p.key === 'essential-yearly');
                if (alive && essential?.amount) setPrice(essential.amount);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, []);
    return price;
};

const SectionHead = ({ title, link, linkLabel }) => (
    <div className='flex flex-wrap items-end justify-between gap-3'>
        <h2 className='heading-display text-4xl sm:text-5xl'>{title}</h2>
        {link && (
            <Link to={link} className='link-reveal font-sans text-xs uppercase tracking-luxe sm:text-sm'>{linkLabel}</Link>
        )}
    </div>
);

const CategoryTile = ({ dept }) => {
    const hasProducts = dept.productCount > 0;
    const body = (
        <>
            <div className={`relative aspect-[4/5] overflow-hidden ${dept.displayImage ? 'bg-[#F1EEE9]' : 'bg-surface-2'}`}>
                {dept.displayImage ? (
                    <img
                        src={dept.displayImage}
                        alt=''
                        loading='lazy'
                        decoding='async'
                        className='h-full w-full object-contain p-6 mix-blend-multiply transition-transform duration-700 ease-luxe group-hover:scale-105'
                    />
                ) : (
                    <span className='absolute inset-0 grid place-items-center break-words px-3 text-center font-display text-2xl leading-tight text-ink/70 sm:text-3xl'>{dept.name}</span>
                )}
            </div>
            <div className='mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
                <p className='min-w-0 font-sans text-base text-ink'>{dept.name}</p>
                <p className='font-sans text-xs text-ink-faint'>
                    {hasProducts ? `${dept.productCount} ${dept.productCount === 1 ? 'piece' : 'pieces'}` : 'Arriving soon'}
                </p>
            </div>
            {dept.description && <p className='mt-1 line-clamp-2 font-sans text-sm text-ink-soft'>{dept.description}</p>}
        </>
    );
    return hasProducts ? (
        <Link to={`/products?category=${encodeURIComponent(dept.slug)}`} className='group block'>{body}</Link>
    ) : (
        <div className='block opacity-80'>{body}</div>
    );
};

// Product photos are shot on white, so their panels stay a light neutral in
// both themes and the photo blends into it (mix-blend-multiply).
const Home = () => {
    const newsletterOn = useFeature('newsletter');
    const dispatch = useDispatch();
    const entryPrice = useEntryPrice();
    const { categories } = useCategories();

    const [email, setEmail] = useState('');

    const { loading, error, products } = useSelector(state => state.products);
    const { success: subscribeSuccess, error: subscribeError } = useSelector(state => state.subscribe);

    useEffect(() => {
        if (subscribeSuccess) {
            toast.success("You're on the list.");
            dispatch(clearNewsletter());
        }
        if (subscribeError) {
            toast.error("You're already on the list.");
            dispatch(clearNewsletter());
        }
    }, [dispatch, subscribeSuccess, subscribeError]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
    }, [dispatch, error]);

    useEffect(() => {
        dispatch(getProduct());
    }, [dispatch]);

    const submitSubscribeHandler = e => {
        e.preventDefault();
        dispatch(newsletter(email));
        setEmail('');
    };

    // Newest first. The hero shows the newest piece; new arrivals show up to
    // four, skipping the hero piece once there are enough others to fill a row.
    const list = (Array.isArray(products) ? products : []).slice().reverse();
    const hero = list.find(firstImage) || list[0];
    const arrivals = (list.length > 4 ? list.filter(p => p !== hero) : list).slice(0, 4);
    const storyProduct = list.find(p => p !== hero && firstImage(p)) || hero;
    const departments = categories.filter(d => !d.parent);

    if (loading && !list.length) return <Loader label='Opening the doors' />;

    return (
        <Fragment>
            <MetaData title='Maison · Curated Objects for Everyday Life' />

            {/* Hero: a real photo next to a short promise */}
            <section className='editorial-shell pt-8 sm:pt-12'>
                <div className='flex flex-wrap items-center gap-10 lg:gap-14'>
                    <Link
                        to={hero ? `/product/${hero._id}` : '/products'}
                        className='group relative block min-w-0 flex-[999_1_520px] overflow-hidden bg-[#F1EEE9]'
                        aria-label={hero ? `Featured: ${hero.name}` : 'Shop the collection'}
                    >
                        <div className='aspect-[4/3] w-full sm:aspect-[16/11]'>
                            {firstImage(hero) && (
                                <img
                                    src={firstImage(hero)}
                                    alt={hero.name}
                                    decoding='async'
                                    className='h-full w-full object-contain p-8 mix-blend-multiply transition-transform duration-700 ease-luxe group-hover:scale-[1.03] sm:p-12'
                                />
                            )}
                        </div>
                        {hero && (
                            <div className='absolute bottom-0 left-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-canvas/90 px-4 py-3 backdrop-blur sm:px-5'>
                                <span className='font-sans text-[0.68rem] uppercase tracking-luxe text-brass'>Featured</span>
                                <span className='font-display text-lg text-ink'>{hero.name}</span>
                                <span className='font-sans text-sm text-ink-soft'>{priceLabel(hero)}</span>
                            </div>
                        )}
                    </Link>

                    <div className='min-w-0 flex-[1_1_340px]'>
                        <p className='eyebrow'>The Autumn Edit</p>
                        <h1 className='heading-display mt-4 text-5xl leading-[1.02] sm:text-6xl'>Everyday objects, chosen well.</h1>
                        <p className='mt-5 max-w-md font-sans text-base leading-relaxed text-ink-soft sm:text-lg'>
                            A short, considered selection of tech, clothing and things for the home — each piece picked to be used daily
                            and kept for years.
                        </p>
                        <div className='mt-8 flex flex-wrap gap-3'>
                            <Link to='/products' className='btn-solid'>Shop new arrivals</Link>
                            <a href='#how-we-choose' className='btn-outline'>How we choose</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Reasons to buy, all true today */}
            <section aria-label='Shopping with Maison' className='editorial-shell mt-14'>
                <ul className='grid grid-cols-1 border-y border-line sm:grid-cols-2 lg:grid-cols-4'>
                    <li className='flex items-center gap-3 py-5 pr-4'>
                        <Icon><path d='M3 7h11v9H3zM14 10h4l3 3v3h-7' /><circle cx='7' cy='17.5' r='1.5' /><circle cx='17' cy='17.5' r='1.5' /></Icon>
                        <span className='font-sans text-sm text-ink'>Free shipping over {formatINR(FREE_SHIPPING_THRESHOLD)}</span>
                    </li>
                    <li className='flex items-center gap-3 py-5 pr-4'>
                        <Icon><path d='M4 12a8 8 0 1 0 3-6.2' /><path d='M4 4v4h4' /></Icon>
                        <span className='font-sans text-sm text-ink'>{RETURN_WINDOW_DAYS}-day returns · {MEMBER_RETURN_WINDOW_DAYS} for members</span>
                    </li>
                    <li className='flex items-center gap-3 py-5 pr-4'>
                        <Icon><rect x='5' y='10' width='14' height='10' /><path d='M8 10V7a4 4 0 0 1 8 0v3' /></Icon>
                        <span className='font-sans text-sm text-ink'>Secure checkout by Cashfree</span>
                    </li>
                    <li className='flex items-center gap-3 py-5 pr-4'>
                        <Icon><path d='M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z' /></Icon>
                        <span className='font-sans text-sm text-ink'>Members: free shipping, always</span>
                    </li>
                </ul>
            </section>

            {/* Departments, managed in Admin > Categories */}
            {departments.length > 0 && (
                <section className='editorial-shell mt-20 sm:mt-24'>
                    <SectionHead title='Shop by category' link='/products' linkLabel='View all' />
                    <div className='mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-5'>
                        {departments.map(dept => <CategoryTile key={dept._id} dept={dept} />)}
                    </div>
                </section>
            )}

            {/* New arrivals */}
            {arrivals.length > 0 && (
                <section className='editorial-shell mt-20 sm:mt-24'>
                    <SectionHead title='New arrivals' link='/products' linkLabel='Shop all' />
                    <div className='mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                        {arrivals.map(product => <ProductCard key={product._id} product={product} />)}
                    </div>
                </section>
            )}

            {/* How we choose */}
            <section id='how-we-choose' className='editorial-shell mt-24 scroll-mt-28 sm:mt-28'>
                <div className='flex flex-wrap bg-surface-2'>
                    <div className='relative min-h-[320px] min-w-0 flex-[1_1_420px] bg-[#F1EEE9] sm:min-h-[440px]'>
                        {firstImage(storyProduct) && (
                            <img src={firstImage(storyProduct)} alt='' loading='lazy' decoding='async' className='absolute inset-0 h-full w-full object-contain p-10 mix-blend-multiply' />
                        )}
                    </div>
                    <div className='flex min-w-0 flex-[1_1_420px] flex-col justify-center px-6 py-12 sm:px-12 sm:py-16'>
                        <p className='eyebrow'>How we choose</p>
                        <h2 className='heading-display mt-4 text-4xl leading-tight sm:text-5xl'>Fewer things, each one worth keeping.</h2>
                        <p className='mt-5 max-w-lg font-sans text-base leading-relaxed text-ink-soft'>
                            Every piece has to pass one simple test: would we reach for it every day, and still want it years from now?
                            We look for good materials, honest build and brands that stand behind what they make — then keep the range
                            small on purpose, so choosing is easy and nothing here is filler.
                        </p>
                        <Link to='/about' className='link-reveal mt-7 self-start font-sans text-xs uppercase tracking-luxe sm:text-sm'>Read our story</Link>
                    </div>
                </div>
            </section>

            {/* Membership */}
            <section className='editorial-shell mt-24 sm:mt-28'>
                <div className='flex flex-wrap items-center justify-between gap-8 bg-ink px-6 py-12 sm:px-12 sm:py-14'>
                    <div className='min-w-0 flex-[1_1_420px]'>
                        <p className='font-sans text-xs uppercase tracking-luxe text-brass-soft'>Maison Membership</p>
                        <h2 className='mt-3 font-display text-3xl font-normal leading-tight text-canvas sm:text-4xl'>
                            Free shipping, 14-day returns and members-only offers. Plus adds early access, back-in-stock first and priority dispatch.
                        </h2>
                    </div>
                    <Link to='/membership' className='btn-luxe shrink-0 bg-canvas px-7 py-4 text-ink hover:bg-brass hover:text-white'>
                        Join from {formatINR(entryPrice)}/year
                    </Link>
                </div>
            </section>

            {/* Newsletter */}
            {newsletterOn && (
                <section className='editorial-shell mt-24 text-center sm:mt-28'>
                    <h2 className='heading-display text-4xl'>New pieces, first.</h2>
                    <p className='mt-3 font-sans text-sm text-ink-soft'>One short email when something new arrives. No spam.</p>
                    <form onSubmit={submitSubscribeHandler} className='mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
                        <label htmlFor='home-newsletter' className='sr-only'>Email address</label>
                        <input
                            id='home-newsletter'
                            type='email'
                            required
                            placeholder='Your email address'
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className='w-full border-b border-ink bg-transparent px-1 py-3 font-sans text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                        />
                        <button type='submit' className='btn-solid shrink-0'>Subscribe</button>
                    </form>
                </section>
            )}
        </Fragment>
    );
};

export default Home;

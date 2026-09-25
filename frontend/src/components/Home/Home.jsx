import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, getProduct } from '../../actions/productAction';
import { clearNewsletter, newsletter } from '../../actions/subscribeAction';
import LoadingBar from 'react-top-loading-bar';
import MetaData from '../layout/MetaData';
import ProductCard from './ProductCard';
import ProductGridItem from './ProductGridItem';

const Home = () => {
    const dispatch = useDispatch();

    const [email, setEmail] = useState('');
    const [progress, setProgress] = useState(0);

    const onLoaderFinished = () => setProgress(0);

    const { loading, error, products } = useSelector(state => state.products);
    const { success: subscribeSuccess, error: subscribeError } = useSelector(state => state.subscribe);

    const submitSubscribeHandler = e => {
        e.preventDefault();
        dispatch(newsletter(email));
        setEmail('');
        setProgress(50);
    };

    useEffect(() => {
        if (subscribeSuccess) {
            toast.success("You've successfully subscribed to our newsletter");
            dispatch(clearNewsletter());
        }
        if (subscribeError) {
            toast.error("You've already subscribed to our newsletter");
        }
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        setProgress(100);
        setTimeout(() => setProgress(0), 5000);
        dispatch(getProduct());
    }, [dispatch, error, subscribeSuccess, subscribeError]);

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Maison · Order Planning' />

                    {/* ── Editorial hero ─────────────────────────── */}
                    <section className='editorial-shell pt-16 pb-10 text-center'>
                        <p className='eyebrow animate-fade-in'>The Autumn Edit · MMXXVI</p>
                        <h1 className='heading-display mx-auto mt-6 max-w-4xl text-display-lg animate-fade-up'>
                            Considered objects for the
                            <span className='italic text-brass'> considered </span>
                            life.
                        </h1>
                        <p className='mx-auto mt-6 max-w-xl font-sans text-base leading-relaxed text-ink-soft animate-fade-up'>
                            A curated house of pieces chosen with intention — designed to be
                            worn, used, and kept for years to come.
                        </p>
                        <div className='mt-9 flex items-center justify-center gap-4 animate-fade-up'>
                            <Link to='/products' className='btn-solid'>Explore the Collection</Link>
                            <Link to='/about' className='btn-outline'>Our Story</Link>
                        </div>
                    </section>

                    {/* ── Featured piece band ────────────────────── */}
                    {products && products.length > 0 && (() => {
                        const featured = products[products.length - 1];
                        const featuredImg =
                            featured?.images?.[0]?.url ||
                            'https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/default.jpg';
                        return (
                            <section className='editorial-shell mt-16'>
                                <div className='grid items-stretch overflow-hidden border border-line md:grid-cols-2'>
                                    <div className='relative aspect-square md:aspect-auto'>
                                        <img
                                            src={featuredImg}
                                            alt={featured?.name}
                                            className='absolute inset-0 h-full w-full object-cover'
                                        />
                                    </div>
                                    <div className='flex flex-col justify-center bg-surface px-8 py-16 lg:px-16'>
                                        <p className='eyebrow'>Featured</p>
                                        <h2 className='heading-display mt-4 text-display'>
                                            {featured?.name}
                                        </h2>
                                        <p className='mt-5 max-w-md font-sans text-base leading-relaxed text-ink-soft line-clamp-4'>
                                            {featured?.description}
                                        </p>
                                        <p className='mt-6 font-display text-3xl font-medium text-ink'>
                                            {`₹${featured?.price}`}
                                        </p>
                                        <div className='mt-8'>
                                            <Link to={`/product/${featured?._id}`} className='btn-outline'>
                                                Discover the Piece
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        );
                    })()}

                    {/* ── New Drop ───────────────────────────────── */}
                    <section className='editorial-shell mt-24'>
                        <div className='mb-10 flex items-end justify-between'>
                            <div>
                                <p className='eyebrow'>Just Landed</p>
                                <h2 className='heading-display mt-3 text-display'>New Drop</h2>
                            </div>
                            <Link to='/products' className='link-reveal hidden font-sans text-sm uppercase tracking-luxe sm:block'>
                                View all
                            </Link>
                        </div>
                        <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'>
                            {products &&
                                products.slice(-3).map(product => (
                                    <ProductCard key={product._id} product={product} />
                                ))}
                        </div>
                    </section>

                    {/* ── Shop All (editorial grid) ──────────────── */}
                    <section className='editorial-shell mt-24'>
                        <div className='mb-10 text-center'>
                            <p className='eyebrow'>The Full House</p>
                            <h2 className='heading-display mt-3 text-display'>Shop All</h2>
                        </div>
                        <div className='grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4'>
                            {products &&
                                products.slice(-4).map(product => (
                                    <ProductGridItem key={product._id} product={product} />
                                ))}
                        </div>
                    </section>

                    {/* ── Newsletter ─────────────────────────────── */}
                    <section className='editorial-shell mt-28'>
                        <div className='relative overflow-hidden border border-line bg-ink px-6 py-20 text-center'>
                            <p className='eyebrow !text-brass-soft'>Stay in the Know</p>
                            <h2 className='heading-display mx-auto mt-4 max-w-2xl text-display !text-canvas'>
                                Join the list. First looks, private releases.
                            </h2>
                            <form
                                onSubmit={submitSubscribeHandler}
                                className='mx-auto mt-10 flex max-w-md flex-col items-center gap-4 sm:flex-row'
                            >
                                <input
                                    type='email'
                                    required
                                    placeholder='Enter your email address'
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className='w-full border-b border-white/25 bg-transparent py-3 text-center font-sans text-canvas placeholder:text-white/40 focus:border-brass focus:outline-none sm:text-left'
                                />
                                <button
                                    type='submit'
                                    onClick={() => setProgress(progress + 60)}
                                    className='btn-luxe w-full shrink-0 bg-brass px-8 py-4 text-white hover:bg-brass-soft sm:w-auto'
                                >
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </section>
                </Fragment>
            )}
        </Fragment>
    );
};

export default Home;

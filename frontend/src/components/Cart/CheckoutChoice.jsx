import React, { Fragment, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';

import MetaData from '../layout/MetaData';
import { useFeature } from '../../context/FeatureFlagsContext';

/*
 * /checkout: how a signed-out shopper wants to check out. Signed-in shoppers
 * go straight on to shipping; with guest checkout switched off, to sign in.
 */
const CheckoutChoice = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useSelector(state => state.user);
    const { cartItems } = useSelector(state => state.cart);
    const guestCheckoutOn = useFeature('guestCheckout');
    const signInPath = `/login?redirect=${encodeURIComponent('/shipping')}`;

    useEffect(() => {
        if (loading) return;
        if (!cartItems?.length) navigate('/cart', { replace: true });
        else if (isAuthenticated) navigate('/shipping', { replace: true });
        else if (!guestCheckoutOn) navigate(signInPath, { replace: true });
    }, [loading, isAuthenticated, guestCheckoutOn, cartItems?.length, navigate, signInPath]);

    return (
        <Fragment>
            <MetaData title='Checkout · Maison' noIndex />
            <div className='editorial-shell py-16'>
                <div className='mx-auto max-w-3xl'>
                    <p className='eyebrow'>Checkout</p>
                    <h1 className='heading-display mt-2 text-4xl sm:text-5xl'>How would you like to check out?</h1>

                    <div className='mt-10 grid gap-5 md:grid-cols-2'>
                        <section className='flex flex-col border border-brass bg-surface p-7'>
                            <p className='eyebrow text-brass'>Fastest</p>
                            <h2 className='mt-3 font-display text-2xl text-ink'>Continue as guest</h2>
                            <p className='mt-3 flex-1 font-sans text-sm leading-relaxed text-ink-soft'>
                                No account needed. We’ll email your invoice and a tracking link. Create an
                                account later with the same email and this order joins it.
                            </p>
                            <Link to='/shipping' className='btn-solid mt-8 w-full text-center'>Continue as guest</Link>
                        </section>

                        <section className='flex flex-col border border-line bg-surface p-7'>
                            <p className='eyebrow'>Members &amp; returning customers</p>
                            <h2 className='mt-3 font-display text-2xl text-ink'>Sign in</h2>
                            <p className='mt-3 flex-1 font-sans text-sm leading-relaxed text-ink-soft'>
                                Use saved addresses, membership benefits like free shipping, and store credit.
                                Returns are started from your account.
                            </p>
                            <div className='mt-8 grid gap-3'>
                                <Link to={signInPath} className='btn-outline w-full text-center'>Sign in</Link>
                                <Link to={`/login?mode=register&redirect=${encodeURIComponent('/shipping')}`} className='text-center font-sans text-sm text-ink-soft underline-offset-4 hover:text-brass hover:underline'>
                                    New here? Create an account
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default CheckoutChoice;

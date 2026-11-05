import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { addItemsToCart, pushCartToServer, removeItemsFromCart, restoreCartFromServer } from '../../actions/cartAction';
import MetaData from '../layout/MetaData';
import CartItemCard from './CartItemCard';
import { useFeature } from '../../context/FeatureFlagsContext';
import { formatINR } from '../../utils/priceLabel';
import { FREE_SHIPPING_THRESHOLD, estimatedDeliveryLabel, shippingFor } from '../../utils/delivery';
import { useIsMember } from '../../utils/useIsMember';

const Cart = () => {
    const { isAuthenticated } = useSelector(state => state.user);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { cartItems } = useSelector(state => state.cart);

    const deleteCartItems = (id, variant = null) => dispatch(removeItemsFromCart(id, variant));
    const checkoutOpen = useFeature('checkout');
    const guestCheckoutOn = useFeature('guestCheckout');

    // Arriving from a reminder email (?restore=1): bring the saved cart onto
    // this device. Otherwise make sure the server has this device's cart.
    const synced = useRef(false);
    useEffect(() => {
        if (!isAuthenticated || synced.current) return;
        synced.current = true;
        const restore = new URLSearchParams(window.location.search).get('restore') === '1';
        if (restore && cartItems.length === 0) {
            dispatch(restoreCartFromServer()).catch(() => {});
        } else if (cartItems.length > 0) {
            dispatch(pushCartToServer());
        }
    }, [isAuthenticated, cartItems.length, dispatch]);

    const checkOutHandler = () => {
        // Signed out: choose guest checkout or signing in.
        if (!isAuthenticated) navigate('/checkout');
        else navigate('/shipping');
    };

    const grossTotal = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const isMember = useIsMember();
    const shipping = shippingFor(grossTotal, isMember);
    const amountToFreeShipping = isMember ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD + 1 - grossTotal);
    const itemCount = cartItems.reduce((n, item) => n + item.quantity, 0);
    const freeShippingProgress = Math.min(100, Math.round((grossTotal / (FREE_SHIPPING_THRESHOLD + 1)) * 100));

    // Quantity: one line updates at a time; the server re-reads price and stock.
    const [updating, setUpdating] = useState(null);
    const changeQuantity = async (item, quantity) => {
        const key = `${item.product}|${item.variant || ''}`;
        setUpdating(key);
        try {
            await dispatch(addItemsToCart(item.product, quantity, item.variant || null));
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Could not update the quantity.');
        } finally {
            setUpdating(null);
        }
    };

    return (
        <Fragment>
            <MetaData title='Cart · Maison' />
            {cartItems.length === 0 ? (
                <div className='editorial-shell flex flex-col items-center justify-center py-32 text-center'>
                    <RemoveShoppingCartIcon sx={{ fontSize: 56, color: '#8A8278' }} />
                    <h2 className='heading-display mt-6 text-4xl'>Your cart is empty</h2>
                    <p className='mt-3 font-sans text-ink-soft'>Nothing curated yet — let's change that.</p>
                    <Link to='/products' className='btn-solid mt-8'>View Products</Link>
                </div>
            ) : (
                <div className='editorial-shell py-14'>
                    <div className='mb-10 text-center'>
                        <p className='eyebrow'>Your Selection</p>
                        <h1 className='heading-display mt-3 text-display'>Shopping Cart</h1>
                        <p className='mt-2 font-sans text-sm text-ink-faint'>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
                    </div>

                    <div className='grid gap-14 lg:grid-cols-[1fr_360px]'>
                        {/* Items */}
                        <div>
                            {/* How far from free shipping (members always have it). */}
                            {isMember === false && (
                                <div role='status' className='mb-8 border border-line bg-surface px-5 py-4'>
                                    <p className='font-sans text-sm text-ink-soft'>
                                        {amountToFreeShipping > 0
                                            ? <>You’re <span className='text-ink'>{formatINR(amountToFreeShipping)}</span> away from complimentary shipping.</>
                                            : <span className='text-success'>Shipping is complimentary on this order.</span>}
                                    </p>
                                    <div aria-hidden='true' className='mt-3 h-1 bg-surface-2'>
                                        <div
                                            className={`h-1 transition-[width] duration-500 ease-luxe ${amountToFreeShipping > 0 ? 'bg-brass' : 'bg-success'}`}
                                            style={{ width: `${freeShippingProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className='hidden grid-cols-[1fr_140px_120px] border-b border-line pb-4 lg:grid'>
                                <span className='eyebrow'>Item</span>
                                <span className='eyebrow text-center'>Quantity</span>
                                <span className='eyebrow text-right'>Subtotal</span>
                            </div>

                            {cartItems.map(item => (
                                <div
                                    key={`${item.product}|${item.variant || ''}`}
                                    className='grid grid-cols-1 items-center gap-6 border-b border-line py-8 lg:grid-cols-[1fr_140px_120px]'
                                >
                                    <CartItemCard item={item} deleteCartItems={deleteCartItems} />

                                    <div className='flex justify-start lg:justify-center'>
                                        {/* Up to 10 a line, and never more than in stock. */}
                                        <div className={`flex items-center border border-line bg-surface ${updating === `${item.product}|${item.variant || ''}` ? 'opacity-60' : ''}`}>
                                            <button
                                                type='button'
                                                aria-label={`One fewer ${item.name}`}
                                                disabled={item.quantity <= 1 || Boolean(updating)}
                                                onClick={() => changeQuantity(item, item.quantity - 1)}
                                                className='h-11 w-11 font-sans text-lg text-ink-soft hover:text-ink disabled:opacity-30'
                                            >
                                                −
                                            </button>
                                            <span aria-live='polite' className='w-8 text-center font-sans text-sm text-ink'>{item.quantity}</span>
                                            <button
                                                type='button'
                                                aria-label={`One more ${item.name}`}
                                                disabled={item.quantity >= Math.min(10, item.stock || 1) || Boolean(updating)}
                                                onClick={() => changeQuantity(item, item.quantity + 1)}
                                                className='h-11 w-11 font-sans text-lg text-ink-soft hover:text-ink disabled:opacity-30'
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <p className='text-left font-sans text-lg text-ink lg:text-right'>
                                        {formatINR(item.price * item.quantity)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className='lg:sticky lg:top-28 lg:self-start'>
                            <div className='border border-line bg-surface p-8'>
                                <h3 className='eyebrow'>Order Summary</h3>
                                <div className='mt-6 flex items-center justify-between font-sans text-sm text-ink-soft'>
                                    <span>Subtotal</span>
                                    <span>{formatINR(grossTotal)}</span>
                                </div>
                                <div className='mt-3 flex items-center justify-between font-sans text-sm text-ink-soft'>
                                    <span>Shipping</span>
                                    {shipping === 0
                                        ? <span className='text-success'>{isMember && grossTotal <= FREE_SHIPPING_THRESHOLD ? 'Complimentary · Member' : 'Complimentary'}</span>
                                        : <span>{formatINR(shipping)}</span>}
                                </div>
                                <div className='my-6 rule-luxe' />
                                <div className='flex items-center justify-between'>
                                    <span className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink'>Total</span>
                                    <span className='font-display text-2xl font-medium text-ink'>{formatINR(grossTotal + shipping)}</span>
                                </div>
                                <p className='mt-2 font-sans text-xs text-ink-faint'>
                                    Arrives by {estimatedDeliveryLabel()} · 7-day returns{isMember ? ' · 14 for members' : ''}
                                </p>
                                <button onClick={checkOutHandler} disabled={!checkoutOpen} className='btn-solid mt-8 w-full disabled:opacity-40'>
                                    Proceed to Checkout
                                </button>
                                {!checkoutOpen && (
                                    <p className='mt-3 text-center font-sans text-sm text-ink-soft'>
                                        We’re not taking new orders right now. Your bag is saved.
                                    </p>
                                )}
                                {checkoutOpen && !isAuthenticated && guestCheckoutOn && (
                                    <p className='mt-3 text-center font-sans text-xs text-ink-soft'>
                                        No account needed · or <Link to={`/login?redirect=${encodeURIComponent('/shipping')}`} className='text-brass underline-offset-4 hover:underline'>sign in</Link> for saved addresses
                                    </p>
                                )}
                                <Link
                                    to='/products'
                                    className='mt-4 block text-center font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft hover:text-brass'
                                >
                                    Continue Shopping
                                </Link>
                            </div>
                            {/* Shipping costs this order and the shopper isn't a member. */}
                            {isMember === false && shipping > 0 && (
                                <div className='mt-4 bg-surface-2 px-6 py-5'>
                                    <p className='font-sans text-sm text-ink'>Never pay shipping again</p>
                                    <p className='mt-1 font-sans text-xs leading-relaxed text-ink-soft'>
                                        Maison Essential includes complimentary shipping on every order and 14-day returns.{' '}
                                        <Link to='/membership' className='text-brass underline-offset-4 hover:underline'>See membership</Link>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
};

export default Cart;

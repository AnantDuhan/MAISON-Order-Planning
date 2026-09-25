import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';

import { addItemsToCart, removeItemsFromCart } from '../../actions/cartAction';
import MetaData from '../layout/MetaData';
import CartItemCard from './CartItemCard';

const Cart = () => {
    const { isAuthenticated } = useSelector(state => state.user);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { cartItems } = useSelector(state => state.cart);

    const deleteCartItems = id => dispatch(removeItemsFromCart(id));

    const checkOutHandler = () => {
        if (!isAuthenticated) navigate('/login');
        else navigate('/shipping');
    };

    const grossTotal = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

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
                    <div className='mb-12 text-center'>
                        <p className='eyebrow'>Your Selection</p>
                        <h1 className='heading-display mt-3 text-display'>Shopping Cart</h1>
                    </div>

                    <div className='grid gap-14 lg:grid-cols-[1fr_360px]'>
                        {/* Items */}
                        <div>
                            <div className='hidden grid-cols-[1fr_140px_120px] border-b border-line pb-4 lg:grid'>
                                <span className='eyebrow'>Item</span>
                                <span className='eyebrow text-center'>Quantity</span>
                                <span className='eyebrow text-right'>Subtotal</span>
                            </div>

                            {cartItems.map(item => (
                                <div
                                    key={item.product}
                                    className='grid grid-cols-1 items-center gap-6 border-b border-line py-8 lg:grid-cols-[1fr_140px_120px]'
                                >
                                    <CartItemCard item={item} deleteCartItems={deleteCartItems} />

                                    <div className='flex justify-start lg:justify-center'>
                                        <select
                                            value={item.quantity}
                                            onChange={e =>
                                                dispatch(addItemsToCart(item.product, Number(e.target.value)))
                                            }
                                            className='border border-line bg-transparent px-4 py-2 font-sans text-sm text-ink focus:border-brass focus:outline-none'
                                        >
                                            {[...Array(Math.min(10, item.stock || 1)).keys()].map(x => (
                                                <option key={x + 1} value={x + 1}>{x + 1}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <p className='text-left font-sans text-lg text-ink lg:text-right'>
                                        {`₹${item.price * item.quantity}`}
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
                                    <span>{`₹${grossTotal}`}</span>
                                </div>
                                <div className='mt-3 flex items-center justify-between font-sans text-sm text-ink-soft'>
                                    <span>Shipping</span>
                                    <span className='text-success'>Complimentary</span>
                                </div>
                                <div className='my-6 rule-luxe' />
                                <div className='flex items-center justify-between'>
                                    <span className='font-sans text-[0.72rem] uppercase tracking-luxe text-ink'>Total</span>
                                    <span className='font-display text-2xl font-medium text-ink'>{`₹${grossTotal}`}</span>
                                </div>
                                <button onClick={checkOutHandler} className='btn-solid mt-8 w-full'>
                                    Proceed to Checkout
                                </button>
                                <Link
                                    to='/products'
                                    className='mt-4 block text-center font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft hover:text-brass'
                                >
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
};

export default Cart;

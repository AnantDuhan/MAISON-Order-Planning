import { Typography } from '@mui/material';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import React, { Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';

import { addItemsToCart, removeItemsFromCart } from '../../actions/cartAction';
import CartItemCard from './CartItemCard';

import './Cart.css';

const Cart = () => {

    const { isAuthenticated } = useSelector(state => state.user);

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { cartItems } = useSelector((state) => state.cart);

    const increaseQuantity = (id, quantity, stock) => {
        const newQty = quantity + 1;
        if (stock <= quantity)
            return;
        dispatch(addItemsToCart(id, newQty));
    }

    const decreaseQuantity = (id, quantity) => {
        const newQty = quantity - 1;
        if (1 >= quantity) return;
        dispatch(addItemsToCart(id, newQty));
    };   
    
    const deleteCartItems = (id) => {
        dispatch(removeItemsFromCart(id));
    };

    const checkOutHandler = () => {
        if (!isAuthenticated)
            navigate('/login');
        else
            navigate('/shipping');
    }
    
    return (
        <Fragment>
            {cartItems.length === 0 ? (
                <div className="emptyCart">
                    <RemoveShoppingCartIcon />
                    <Typography>No Product in your Cart</Typography>
                    <Link to="/products">View Products</Link>
                </div>
            ) : (
                <Fragment>
                    <div className="cartPage">
                        <div className="cartHeader">
                            <p>Product</p>
                            <p>Quantity</p>
                            <p>Subtotal</p>
                        </div>
                        {cartItems &&
                            cartItems.map((item) => (
                                // FIX: Moved the key to the outermost wrapper and used the unique product ID
                                <div className="cartContainer" key={item.product}> 
                                    <CartItemCard
                                        item={item}
                                        deleteCartItems={deleteCartItems}
                                    />
                                    
                                    {/* --- NEW DROPDOWN --- */}
                                    <div className="cartInput">
                                        <select
                                            value={item.quantity}
                                            onChange={(e) => dispatch(addItemsToCart(item.product, Number(e.target.value)))}
                                            style={{ padding: '5px 15px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' }}
                                        >
                                            {/* Generates options from 1 to 10, or max stock */}
                                            {[...Array(Math.min(10, item.stock || 1)).keys()].map((x) => (
                                                <option key={x + 1} value={x + 1}>
                                                    {x + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <p className="cartSubtotal">{`₹${item.price * item.quantity}`}</p>
                                </div>
                            ))
                        }
                        <div className="cartGrossTotal">
                            <div></div>
                            <div className="cartGrossTotalBox">
                                <p>Gross Total</p>
                                    <p>{`₹${cartItems.reduce(
                                    (acc, item) => acc + item.quantity * item.price, 0
                                )}`}</p>
                            </div>
                            <div></div>
                            <div className="checkOutBtn">
                                <button onClick={checkOutHandler}>Check Out</button>
                            </div>
                        </div>
                    </div> 
                </Fragment>
            )}
        </Fragment>
    );
};

export default Cart;

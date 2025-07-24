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
                                <div className="cartContainer">
                                    <CartItemCard
                                        key={item}
                                        item={item}
                                        deleteCartItems={deleteCartItems}
                                    />
                                    <div className="cartInput">
                                        <button
                                            onClick={() =>
                                                decreaseQuantity(
                                                    item.product,
                                                    item.quantity
                                                )
                                            }
                                        >
                                            -
                                        </button>
                                        <input
                                            readOnly
                                            type="number"
                                            value={item.quantity}
                                        />
                                        <button
                                            onClick={() =>
                                                increaseQuantity(
                                                    item.product,
                                                    item.quantity,
                                                    item.stock
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="cartSubtotal">{`₹${
                                        item.price * item.quantity
                                    }`}</p>
                                </div>
                            ))}
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

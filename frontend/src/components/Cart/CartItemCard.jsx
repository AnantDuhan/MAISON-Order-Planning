import React from 'react';
import { Link } from 'react-router-dom';

const CartItemCard = ({ item, deleteCartItems }) => {
    return (
        <div className='flex gap-5'>
            <Link to={`/product/${item.product}`} className='shrink-0'>
                <img
                    src={item.image}
                    alt={item.name}
                    className='h-28 w-24 border border-line object-cover'
                />
            </Link>
            <div className='flex flex-col justify-center'>
                <Link
                    to={`/product/${item.product}`}
                    className='font-display text-xl font-medium text-ink transition-colors hover:text-brass'
                >
                    {item.name}
                </Link>
                <span className='mt-1 font-sans text-sm text-ink-soft'>{`₹${item.price}`}</span>
                <button
                    onClick={() => deleteCartItems(item.product)}
                    className='mt-3 self-start font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint transition-colors hover:text-danger'
                >
                    Remove
                </button>
            </div>
        </div>
    );
};

export default CartItemCard;

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { logout } from '../../../actions/userAction';

import './MainHeader.css';
// import { productsSearchReducer } from '../../../reducers/productReducer';
import { searchProducts } from '../../../actions/productAction';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const MainHeader =() => {
    const { isAuthenticated, user } = useSelector(state => state.user);

    const [keyword, setKeyword] = useState('');
    const debouncedKeyword = useDebounce(keyword, 500);

    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
        toast.success('Logout Successfully');
    };

    const navigate = useNavigate();

    const { cartItems } = useSelector(state => state.cart);

    useEffect(() => {
        if (debouncedKeyword.trim()) {
            console.log(`✅ DISPATCHING SEARCH FOR: "${debouncedKeyword}"`);
            dispatch(searchProducts(debouncedKeyword));
            navigate(`products/search?keyword=${debouncedKeyword}`);
        } else {
            navigate('/products');
        }
    }, [debouncedKeyword, dispatch, navigate]);

    return (
        <nav className='nav'>
            <div className='nav-menu flex-row'>
                <div className='nav-brand'>
                    <Link to='/'>
                        <img
                            src='https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/Ecommerce-logo.png'
                            alt='order-planning'
                            className='logo-img'
                        />
                    </Link>
                </div>
                {/* <div className='toggle-collapse' onClick={toggleNav}>
                    <p>Logo</p>
                </div> */}
                <div>
                    <div className='nav-items'>
                        {user?.role === 'admin' && (
                            <Link to='/admin/dashboard' className='nav-link'>
                                Dashboard
                            </Link>
                        )}
                        <Link to='/products' className='nav-link'>
                            Products
                        </Link>
                        <Link to='/orders' className='nav-link'>
                            Orders
                        </Link>
                        <Link to='/contact-us' className='nav-link'>
                            Contact
                        </Link>
                        <Link to='/about' className='nav-link'>
                            About
                        </Link>
                    </div>
                </div>
                <div className='social'>
                    {/* Search Box */}
                    {/* <form className='searchBox' onSubmit={searchSubmitHandler}>
                        <div className='searchContainer'>
                            <input
                                type='text'
                                placeholder='Search a Product...'
                                onChange={e => setProduct(e.target.value)}
                            />
                            <FaSearch className='searchIcon' />
                        </div>
                    </form> */}

                    <div className='social'>
                        <form className='searchBox'>
                            <div className='searchContainer'>
                                <input
                                    type='text'
                                    placeholder='Search a Product...'
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                />
                                <FaSearch className='searchIcon' />
                            </div>
                        </form>
                    </div>

                    <Link to='/wishlist' className='nav-link'>
                        <div className='wishlist-container'>
                            <FavoriteIcon className='wishlistIcon' />
                        </div>
                    </Link>

                    <Link to='/cart' className='nav-link'>
                        <div className='cart-icon-container'>
                            <ShoppingCartIcon />
                            {cartItems.length > 0 && (
                                <span className='cart-badge'>
                                    {cartItems.length}
                                </span>
                            )}
                        </div>
                    </Link>

                    {isAuthenticated ? (
                        <div className='user-profile'>
                            <Link to='/account'>
                                <img
                                    src={
                                        user.avatar
                                            ? user.avatar
                                            : '/Profile.png'
                                    }
                                    alt={`${user.name}`}
                                    className='profile-photo'
                                />
                            </Link>
                            <button
                                onClick={handleLogout}
                                className='logout-button'
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to='/login' className='login-button'>
                            Login
                        </Link>
                    )}
                    <Link to='/join/plus-membership' className='platinum-btn'>
                        Subscribe
                    </Link>
                </div>
            </div>
        </nav>
    );
}

export default MainHeader;

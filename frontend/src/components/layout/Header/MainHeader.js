import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import React, { useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios'; // Import axios

import { logout } from '../../../actions/userAction';
import './MainHeader.css';

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

const MainHeader = () => {
    const { isAuthenticated, user } = useSelector(state => state.user);
    const { cartItems } = useSelector(state => state.cart);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

    const debouncedKeyword = useDebounce(keyword, 300);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
        toast.success('Logout Successfully');
    };

    const handleDropDownSuggestionClick = (suggestion) => {
        setKeyword(suggestion.name);
        navigate(`/product/${suggestion._id}`);
        setIsSuggestionsVisible(false);
    };

    useEffect(() => {
        if (debouncedKeyword && typeof debouncedKeyword === 'string' && debouncedKeyword.trim() !== '') {
            const fetchSuggestions = async () => {
                try {
                    const { data } = await axios.get(`/api/v1/autocomplete?keyword=${debouncedKeyword}`);
                    setSuggestions(data.suggestions || []);
                    setIsSuggestionsVisible(true);
                } catch (error) {
                    console.error("Error fetching suggestions:", error);
                    setSuggestions([]);
                }
            };
            fetchSuggestions();
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    }, [debouncedKeyword]);

    const searchSubmitHandler = (e) => {
        e.preventDefault();
        console.log("Submitting search with keyword:", keyword); // Add this
        if (keyword.trim()) {
            console.log("Keyword is not empty, navigating..."); // Add this
            navigate(`/search?keyword=${keyword}`);
            setIsSuggestionsVisible(false);
        } else {
            console.log("Keyword is empty, navigation stopped."); // And this
        }
    };

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
                    <form className='searchBox' onSubmit={searchSubmitHandler}>
                        <div className='searchContainer'>
                            <input
                                type='text'
                                placeholder='Search a Product...'
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onFocus={() => setIsSuggestionsVisible(true)}
                                onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 200)} 
                            />
                            <button type="submit" className="searchIcon-btn">
                                <FaSearch className='searchIcon' />
                            </button>
                        </div>
                        {isSuggestionsVisible && suggestions.length > 0 && (
                            <ul className="suggestions-dropdown">
                                {suggestions.map((suggestion) => (
                                    <li key={suggestion._id} onMouseDown={() => handleDropDownSuggestionClick(suggestion)}>
                                        {suggestion.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </form>

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
                                    src={user?.avatar?.url || user?.avatar || '/Profile.png'}
                                    alt={user?.name}
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

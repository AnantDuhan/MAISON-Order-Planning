import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import React, { useEffect, useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

import { logout } from '../../../actions/userAction';
import ThemeToggle from '../ThemeToggle';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const navLinks = [
    { to: '/products', label: 'Shop' },
    { to: '/orders', label: 'Orders' },
    { to: '/about', label: 'About' },
    { to: '/contact-us', label: 'Contact' },
];

const MainHeader = () => {
    const { isAuthenticated, user } = useSelector(state => state.user);
    const { cartItems } = useSelector(state => state.cart);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const debouncedKeyword = useDebounce(keyword, 300);
    const searchRef = useRef(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
        toast.success('Logout Successfully');
    };

    const handleDropDownSuggestionClick = suggestion => {
        setKeyword(suggestion.name);
        navigate(`/product/${suggestion.id}`);
        setIsSuggestionsVisible(false);
    };

    useEffect(() => {
        if (debouncedKeyword && typeof debouncedKeyword === 'string' && debouncedKeyword.trim() !== '') {
            const fetchSuggestions = async () => {
                try {
                    const { data } = await axios.get(`/api/v1/products/autocomplete?query=${debouncedKeyword}`);
                    setSuggestions(data.data || []);
                    setIsSuggestionsVisible(true);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                }
            };
            fetchSuggestions();
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    }, [debouncedKeyword]);

    const searchSubmitHandler = e => {
        e.preventDefault();
        if (keyword.trim()) {
            navigate(`/search?keyword=${keyword}`);
            setIsSuggestionsVisible(false);
            setMenuOpen(false);
        }
    };

    return (
        <header
            className={`sticky top-0 z-50 border-b transition-all duration-500 ease-luxe ${
                scrolled
                    ? 'border-line bg-canvas/85 backdrop-blur-md'
                    : 'border-transparent bg-canvas'
            }`}
        >
            {/* Announcement strip */}
            <div className='hidden bg-ink text-canvas md:block'>
                <p className='mx-auto max-w-editorial px-6 py-2 text-center font-sans text-[0.68rem] uppercase tracking-luxe lg:px-12'>
                    Complimentary shipping on every order · Crafted for the considered life
                </p>
            </div>

            <nav className='mx-auto flex max-w-editorial items-center justify-between gap-6 px-6 py-5 lg:px-12'>
                {/* Left: mobile toggle + nav */}
                <div className='flex flex-1 items-center gap-6'>
                    <button
                        type='button'
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label='Menu'
                        className='text-ink lg:hidden'
                    >
                        <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                            {menuOpen ? <path d='M6 6l12 12M18 6L6 18' /> : <path d='M3 7h18M3 12h18M3 17h18' />}
                        </svg>
                    </button>
                    <ul className='hidden items-center gap-8 lg:flex'>
                        {user?.role === 'admin' && (
                            <li>
                                <Link to='/admin/dashboard' className='eyebrow !tracking-wide hover:text-brass'>
                                    Dashboard
                                </Link>
                            </li>
                        )}
                        {navLinks.map(l => (
                            <li key={l.to}>
                                <Link to={l.to} className='link-reveal font-sans text-[0.82rem] uppercase tracking-luxe'>
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Center: wordmark */}
                <Link to='/' className='flex flex-shrink-0 flex-col items-center leading-none'>
                    <span className='font-display text-2xl font-medium tracking-wide text-ink sm:text-[1.75rem]'>
                        MAISON
                    </span>
                    <span className='mt-0.5 font-sans text-[0.55rem] uppercase tracking-wide2 text-brass'>
                        Order Planning
                    </span>
                </Link>

                {/* Right: actions */}
                <div className='flex flex-1 items-center justify-end gap-3 sm:gap-4'>
                    <form ref={searchRef} className='relative hidden md:block' onSubmit={searchSubmitHandler}>
                        <div className='flex items-center gap-2 border-b border-line focus-within:border-brass'>
                            <FaSearch className='text-ink-faint' size={13} />
                            <input
                                type='text'
                                placeholder='Search'
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                onFocus={() => setIsSuggestionsVisible(true)}
                                onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 200)}
                                className='w-28 bg-transparent py-2 font-sans text-sm text-ink placeholder:text-ink-faint focus:w-44 focus:outline-none transition-all duration-500 ease-luxe'
                            />
                        </div>
                        {isSuggestionsVisible && suggestions.length > 0 && (
                            <ul className='absolute right-0 top-full z-50 mt-2 w-64 border border-line bg-surface py-2 shadow-luxe'>
                                {suggestions.map(s => (
                                    <li
                                        key={s.id}
                                        onMouseDown={() => handleDropDownSuggestionClick(s)}
                                        className='cursor-pointer px-4 py-2 font-sans text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-brass'
                                    >
                                        {s.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </form>

                    <ThemeToggle />

                    <Link to='/wishlist' aria-label='Wishlist' className='text-ink transition-colors hover:text-brass'>
                        <FavoriteBorderIcon fontSize='small' />
                    </Link>

                    <Link to='/cart' aria-label='Cart' className='relative text-ink transition-colors hover:text-brass'>
                        <ShoppingCartIcon fontSize='small' />
                        {cartItems.length > 0 && (
                            <span className='absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-brass text-[0.6rem] font-medium text-white'>
                                {cartItems.length}
                            </span>
                        )}
                    </Link>

                    {isAuthenticated ? (
                        <div className='flex items-center gap-3'>
                            <Link to='/account' aria-label='Account'>
                                <img
                                    src={user?.avatar?.url || user?.avatar || '/Profile.png'}
                                    alt={user?.name}
                                    className='h-8 w-8 rounded-full border border-line object-cover'
                                />
                            </Link>
                            <button
                                onClick={handleLogout}
                                className='hidden font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft transition-colors hover:text-brass lg:block'
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to='/login' className='btn-solid !px-5 !py-2.5 !text-[0.68rem]'>
                            Login
                        </Link>
                    )}
                </div>
            </nav>

            {/* Mobile menu */}
            {menuOpen && (
                <div className='border-t border-line bg-canvas px-6 py-6 lg:hidden'>
                    <form className='mb-5 flex items-center gap-2 border-b border-line' onSubmit={searchSubmitHandler}>
                        <FaSearch className='text-ink-faint' size={13} />
                        <input
                            type='text'
                            placeholder='Search a product'
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            className='w-full bg-transparent py-2 font-sans text-sm text-ink placeholder:text-ink-faint focus:outline-none'
                        />
                    </form>
                    <ul className='flex flex-col gap-4'>
                        {user?.role === 'admin' && (
                            <li>
                                <Link to='/admin/dashboard' onClick={() => setMenuOpen(false)} className='font-sans text-sm uppercase tracking-luxe text-ink'>
                                    Dashboard
                                </Link>
                            </li>
                        )}
                        {navLinks.map(l => (
                            <li key={l.to}>
                                <Link to={l.to} onClick={() => setMenuOpen(false)} className='font-sans text-sm uppercase tracking-luxe text-ink'>
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                        {isAuthenticated && (
                            <li>
                                <button onClick={handleLogout} className='font-sans text-sm uppercase tracking-luxe text-danger'>
                                    Logout
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </header>
    );
};

export default MainHeader;

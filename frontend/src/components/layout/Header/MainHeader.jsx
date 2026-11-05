import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { useLogout } from '../../../utils/useLogout';
import ThemeToggle from '../ThemeToggle';
import { useOverlay } from '../../../utils/useOverlay';
import { formatINR } from '../../../utils/priceLabel';
import { FREE_SHIPPING_THRESHOLD } from '../../../utils/delivery';
import { useMembership } from '../../../utils/useIsMember';
import { useCategories } from '../../../utils/useCategories';
import { useFeature } from '../../../context/FeatureFlagsContext';
import HeaderSearch from './HeaderSearch';

// Phone menu links. On desktop the bar shows the store's departments instead;
// these stay reachable from the footer and the account menu.
const navLinks = [
    { to: '/products', label: 'Shop' },
    { to: '/orders', label: 'Orders' },
    { to: '/about', label: 'About' },
    { to: '/contact-us', label: 'Contact' },
];

const MainHeader = () => {
    const { isAuthenticated, user } = useSelector(state => state.user);
    const { cartItems } = useSelector(state => state.cart);
    const [menuOpen, setMenuOpen] = useState(false);
    useOverlay(menuOpen);
    // Departments for the desktop bar and the phone menu (shared, cached request).
    const { categories: departments } = useCategories();
    const membershipsOn = useFeature('memberships');
    const closeMenu = () => setMenuOpen(false);
    const [scrolled, setScrolled] = useState(false);
    // Shared with the rest of the app: one request, not one per component.
    const membership = useMembership();

    // Phones: the search field under the logo slides away while scrolling
    // down the page and comes back on the way up.
    const [phoneSearchHidden, setPhoneSearchHidden] = useState(false);

    useEffect(() => {
        let lastY = window.scrollY;
        let hidden = false;
        let settleUntil = 0;
        const onScroll = () => {
            const y = window.scrollY;
            setScrolled(y > 8);
            // Showing or hiding the field changes the header's height, and the
            // browser shifts the page to match. Ignore scroll events while that
            // settles, or the field would flicker in and out.
            const now = Date.now();
            if (now < settleUntil) {
                lastY = y;
                return;
            }
            if (Math.abs(y - lastY) < 12) return;
            const next = y > 120 && y > lastY;
            lastY = y;
            if (next !== hidden) {
                hidden = next;
                settleUntil = now + 400;
                setPhoneSearchHidden(next);
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);


    // Close the menu first so the toast isn't drawn over it.
    const { signOut: handleLogout } = useLogout({ before: () => setMenuOpen(false) });

    return (
        <header
            className={`sticky top-0 z-50 border-b transition-all duration-500 ease-luxe ${
                scrolled
                    ? 'border-line bg-canvas/85 backdrop-blur-md'
                    : 'border-transparent bg-canvas'
            }`}
        >
            {/* Announcement strip */}
            {/* Members are told their perk; everyone else how to get it. */}
            <div className='hidden bg-ink text-canvas md:block'>
                <p className='mx-auto max-w-editorial px-6 py-2 text-center font-sans text-[0.68rem] uppercase tracking-luxe lg:px-12'>
                    {membership?.isActive ? (
                        <>Your membership is active · complimentary shipping on every order</>
                    ) : membershipsOn ? (
                        <>
                            Complimentary shipping over {formatINR(FREE_SHIPPING_THRESHOLD)} · Members never pay shipping ·{' '}
                            <Link to='/membership' className='underline decoration-canvas/50 underline-offset-4 transition-colors hover:text-white hover:decoration-white'>
                                Join Maison Essential
                            </Link>
                        </>
                    ) : (
                        <>Complimentary shipping on orders over {formatINR(FREE_SHIPPING_THRESHOLD)} · Crafted for the considered life</>
                    )}
                </p>
            </div>

            <nav className='mx-auto flex max-w-editorial items-center justify-between gap-3 px-5 py-5 sm:gap-6 sm:px-6 lg:px-12'>
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
                    <ul className='hidden items-center gap-6 lg:flex xl:gap-8' aria-label='Shop'>
                        <li>
                            <Link to='/products' className='link-reveal whitespace-nowrap font-sans text-[0.82rem] uppercase tracking-luxe'>
                                Shop all
                            </Link>
                        </li>
                        {/* Two departments fit beside the centred wordmark at 1024px, three from 1280px. */}
                        {departments.slice(0, 3).map((dept, i) => (
                            <li key={dept._id} className={i === 2 ? 'hidden xl:block' : undefined}>
                                <Link
                                    to={`/products?category=${encodeURIComponent(dept.slug)}`}
                                    className='link-reveal whitespace-nowrap font-sans text-[0.82rem] uppercase tracking-luxe'
                                >
                                    {dept.name}
                                </Link>
                            </li>
                        ))}
                        {departments.length === 0 && navLinks.slice(1).map(l => (
                            <li key={l.to}>
                                <Link to={l.to} className='link-reveal font-sans text-[0.82rem] uppercase tracking-luxe'>
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Center: wordmark */}
                <Link to='/' aria-label='Maison home' className='flex flex-shrink-0 items-center leading-none'>
                    <span className='font-display text-[1.7rem] font-medium tracking-[0.18em] text-ink sm:text-[2rem]'>
                        MAISON
                    </span>
                </Link>

                {/* Right: actions */}
                <div className='flex flex-1 items-center justify-end gap-3 sm:gap-4 lg:gap-3 xl:gap-4'>
                    <div className='hidden md:block'>
                        <HeaderSearch />
                    </div>

                    {/* Phones keep only cart and account in the bar; the rest is in the menu. */}
                    <span className='hidden sm:block'>
                        <ThemeToggle />
                    </span>

                    {isAuthenticated && (
                        <Link
                            to='/membership'
                            aria-label={membership?.isActive ? 'Active membership' : 'Membership'}
                            title={membership?.isActive ? 'Active membership' : 'Membership'}
                            className={`relative hidden text-ink transition-colors hover:text-brass sm:block ${membership?.isActive ? 'text-brass' : ''}`}
                        >
                            <CardMembershipIcon fontSize='small' />
                            {membership?.isActive && <span className='absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brass ring-2 ring-canvas' />}
                        </Link>
                    )}

                    <Link to='/wishlist' aria-label='Wishlist' className='hidden text-ink transition-colors hover:text-brass sm:block'>
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

                    {/* Admin: a quiet icon at the end, so it doesn't crowd the wordmark. In the menu on phones. */}
                    {user?.role === 'admin' && (
                        <Link
                            to='/admin/dashboard'
                            title='Admin dashboard'
                            aria-label='Admin dashboard'
                            className='hidden text-ink transition-colors hover:text-brass sm:block'
                        >
                            <svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
                                <rect x='3' y='3' width='7' height='9' />
                                <rect x='14' y='3' width='7' height='5' />
                                <rect x='14' y='12' width='7' height='9' />
                                <rect x='3' y='16' width='7' height='5' />
                            </svg>
                        </Link>
                    )}

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
                        <>
                            <Link to='/login' aria-label='Login' className='text-ink transition-colors hover:text-brass sm:hidden'>
                                <PersonOutlineIcon fontSize='small' />
                            </Link>
                            <Link to='/login' className='btn-solid hidden shrink-0 !px-5 !py-2.5 !text-[0.68rem] sm:inline-flex'>
                                Login
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Phones: search always one tap away, under the logo. */}
            {!menuOpen && (
                <div
                    className={`px-5 transition-[max-height,opacity,padding] duration-300 ease-luxe sm:px-6 md:hidden ${
                        phoneSearchHidden ? 'max-h-0 overflow-hidden pb-0 opacity-0' : 'max-h-20 pb-3 opacity-100'
                    }`}
                    aria-hidden={phoneSearchHidden || undefined}
                    inert={phoneSearchHidden ? '' : undefined}
                >
                    <HeaderSearch variant='phone' placeholder='Search products' />
                </div>
            )}

            {/* Mobile menu */}
            {menuOpen && (
                <div className='border-t border-line bg-canvas px-6 py-6 lg:hidden'>
                    <div className='mb-6 md:hidden'>
                        <HeaderSearch variant='phone' placeholder='Search products' onSearched={closeMenu} />
                    </div>
                    {departments.length > 0 && (
                        <nav aria-label='Shop by category' className='mb-6'>
                            <p className='eyebrow mb-3'>Shop by category</p>
                            <div className='grid grid-cols-2 gap-2.5'>
                                {departments.slice(0, 5).map(dept => (
                                    <Link
                                        key={dept._id}
                                        to={`/products?category=${encodeURIComponent(dept.slug)}`}
                                        onClick={closeMenu}
                                        className='relative flex h-20 items-end overflow-hidden bg-surface-2 p-2'
                                    >
                                        {dept.displayImage && (
                                            <img src={dept.displayImage} alt='' loading='lazy' decoding='async' className='absolute inset-0 h-full w-full object-cover' />
                                        )}
                                        <span className='relative bg-surface/95 px-2 py-1 font-sans text-xs text-ink'>{dept.name}</span>
                                    </Link>
                                ))}
                                <Link to='/products' onClick={closeMenu} className='flex h-20 items-center justify-center border border-line font-sans text-xs uppercase tracking-luxe text-ink'>
                                    Shop all
                                </Link>
                            </div>
                        </nav>
                    )}
                    <ul className='flex flex-col gap-4'>
                        {user?.role === 'admin' && (
                            <li>
                                <Link
                                    to='/admin/dashboard'
                                    onClick={() => setMenuOpen(false)}
                                    className='inline-flex items-center gap-2 border border-brass px-3 py-1.5 font-sans text-sm uppercase tracking-luxe text-brass'
                                >
                                    Admin Dashboard
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
                                <Link to='/membership' onClick={() => setMenuOpen(false)} className={`flex items-center gap-2 font-sans text-sm uppercase tracking-luxe ${membership?.isActive ? 'text-brass' : 'text-ink'}`}>
                                    <CardMembershipIcon fontSize='small' />
                                    {membership?.isActive ? 'Active Membership' : 'Membership'}
                                </Link>
                            </li>
                        )}
                        <li className='sm:hidden'>
                            <Link to='/wishlist' onClick={() => setMenuOpen(false)} className='flex items-center gap-2 font-sans text-sm uppercase tracking-luxe text-ink'>
                                <FavoriteBorderIcon fontSize='small' />
                                Wishlist
                            </Link>
                        </li>
                        <li className='flex items-center gap-3 sm:hidden'>
                            <ThemeToggle />
                            <span className='font-sans text-sm uppercase tracking-luxe text-ink'>Theme</span>
                        </li>
                        {!isAuthenticated && (
                            <li>
                                <Link to='/track' onClick={closeMenu} className='font-sans text-sm uppercase tracking-luxe text-ink'>
                                    Track an order
                                </Link>
                            </li>
                        )}
                        {!isAuthenticated && (
                            <li className='mt-2 sm:hidden'>
                                <Link to='/login' onClick={closeMenu} className='btn-solid block w-full text-center'>
                                    Sign in
                                </Link>
                            </li>
                        )}
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

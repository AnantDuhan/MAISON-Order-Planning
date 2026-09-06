import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import { logout } from '../../../actions/userAction';
import ThemeToggle from '../ThemeToggle';

const links = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/products', label: 'Products' },
    { to: '/admin/add-product', label: 'Add Product' },
    { to: '/admin/orders', label: 'Orders' },
    { to: '/admin/reviews', label: 'Reviews' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/returns', label: 'Returns' },
    { to: '/admin/refunds', label: 'Refunds' },
];

const AdminHeader = () => {
    const { isAuthenticated, user } = useSelector(state => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
        toast.success('Logout Successfully');
    };

    return (
        <header className='sticky top-0 z-50 border-b border-line bg-canvas/90 backdrop-blur-md'>
            <nav className='mx-auto flex max-w-editorial items-center justify-between gap-6 px-6 py-4 lg:px-12'>
                {/* Brand */}
                <Link to='/' className='flex flex-col leading-none'>
                    <span className='font-display text-xl font-medium tracking-wide text-ink'>MAISON</span>
                    <span className='mt-0.5 font-sans text-[0.52rem] uppercase tracking-wide2 text-brass'>
                        Admin Panel
                    </span>
                </Link>

                {/* Desktop nav */}
                <ul className='hidden flex-1 items-center justify-center gap-6 xl:flex'>
                    {links.map(l => {
                        const active = location.pathname === l.to;
                        return (
                            <li key={l.to}>
                                <Link
                                    to={l.to}
                                    className={`font-sans text-[0.7rem] uppercase tracking-luxe transition-colors ${
                                        active ? 'text-brass' : 'text-ink-soft hover:text-ink'
                                    }`}
                                >
                                    {l.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Actions */}
                <div className='flex items-center gap-3'>
                    <ThemeToggle />

                    {isAuthenticated ? (
                        <div className='flex items-center gap-3'>
                            <Link to='/account'>
                                <img
                                    src={user?.avatar?.url || user?.avatar || '/Profile.png'}
                                    alt={user?.name}
                                    className='h-8 w-8 rounded-full border border-line object-cover'
                                />
                            </Link>
                            <button
                                onClick={handleLogout}
                                className='hidden font-sans text-[0.7rem] uppercase tracking-luxe text-ink-soft transition-colors hover:text-brass sm:block'
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to='/login' className='btn-solid !px-5 !py-2.5 !text-[0.68rem]'>Login</Link>
                    )}

                    <button
                        onClick={() => setMenuOpen(o => !o)}
                        aria-label='Menu'
                        className='text-ink xl:hidden'
                    >
                        <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                            {menuOpen ? <path d='M6 6l12 12M18 6L6 18' /> : <path d='M3 7h18M3 12h18M3 17h18' />}
                        </svg>
                    </button>
                </div>
            </nav>

            {/* Mobile nav */}
            {menuOpen && (
                <div className='border-t border-line bg-canvas px-6 py-6 xl:hidden'>
                    <ul className='grid grid-cols-2 gap-4'>
                        {links.map(l => (
                            <li key={l.to}>
                                <Link
                                    to={l.to}
                                    onClick={() => setMenuOpen(false)}
                                    className='font-sans text-sm uppercase tracking-luxe text-ink'
                                >
                                    {l.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    {isAuthenticated && (
                        <button
                            onClick={handleLogout}
                            className='mt-6 font-sans text-sm uppercase tracking-luxe text-danger'
                        >
                            Logout
                        </button>
                    )}
                </div>
            )}
        </header>
    );
};

export default AdminHeader;

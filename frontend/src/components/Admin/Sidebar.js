import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PostAddIcon from '@mui/icons-material/PostAdd';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Sidebar = () => {
    const location = useLocation();
    const [productsOpen, setProductsOpen] = useState(true);

    const itemClass = to =>
        `flex items-center gap-3 py-3 font-sans text-[0.75rem] uppercase tracking-luxe transition-colors ${
            location.pathname === to ? 'text-brass' : 'text-ink-soft hover:text-ink'
        }`;

    return (
        <aside className='w-full border-r border-line bg-surface px-6 py-8 lg:min-h-screen lg:w-64'>
            <Link to='/' className='flex flex-col leading-none'>
                <span className='font-display text-2xl font-medium tracking-wide text-ink'>MAISON</span>
                <span className='mt-0.5 font-sans text-[0.52rem] uppercase tracking-wide2 text-brass'>
                    Admin Panel
                </span>
            </Link>

            <nav className='mt-10 flex flex-col'>
                <Link to='/admin/dashboard' className={itemClass('/admin/dashboard')}>
                    <DashboardIcon fontSize='small' /> Dashboard
                </Link>

                <div>
                    <button
                        onClick={() => setProductsOpen(o => !o)}
                        className='flex w-full items-center justify-between py-3 font-sans text-[0.75rem] uppercase tracking-luxe text-ink-soft transition-colors hover:text-ink'
                    >
                        <span className='flex items-center gap-3'>
                            <PostAddIcon fontSize='small' /> Products
                        </span>
                        <ExpandMoreIcon
                            fontSize='small'
                            className={`transition-transform duration-300 ${productsOpen ? 'rotate-180' : ''}`}
                        />
                    </button>
                    {productsOpen && (
                        <div className='ml-4 flex flex-col border-l border-line pl-4'>
                            <Link to='/admin/products' className={itemClass('/admin/products')}>
                                <PostAddIcon fontSize='small' /> All
                            </Link>
                            <Link to='/admin/product' className={itemClass('/admin/product')}>
                                <AddIcon fontSize='small' /> Create
                            </Link>
                        </div>
                    )}
                </div>

                <Link to='/admin/orders' className={itemClass('/admin/orders')}>
                    <ListAltIcon fontSize='small' /> Orders
                </Link>
                <Link to='/admin/users' className={itemClass('/admin/users')}>
                    <PeopleIcon fontSize='small' /> Users
                </Link>
                <Link to='/admin/reviews' className={itemClass('/admin/reviews')}>
                    <RateReviewIcon fontSize='small' /> Reviews
                </Link>
            </nav>
        </aside>
    );
};

export default Sidebar;

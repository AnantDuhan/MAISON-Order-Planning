import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import { useFeature } from '../../../context/FeatureFlagsContext';

/**
 * Reminds signed-in admins that customers currently see the maintenance page,
 * so the shop isn't left closed by accident.
 */
const MaintenanceBanner = () => {
    const { user } = useSelector(state => state.user);
    const storefrontOpen = useFeature('storefront');

    if (storefrontOpen || user?.role !== 'admin' || user?.isDemo) return null;

    return (
        <div className='border-b border-brass/40 bg-brass/10 text-ink' role='status'>
            <div className='mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2.5 text-center font-sans text-sm'>
                <span className='flex items-center gap-2'>
                    <span className='h-1.5 w-1.5 rounded-full bg-brass' aria-hidden='true' />
                    The shop is closed for maintenance. Customers see the maintenance page.
                </span>
                <Link to='/admin/features' className='font-medium text-brass underline underline-offset-4'>
                    Reopen the shop
                </Link>
            </div>
        </div>
    );
};

export default MaintenanceBanner;

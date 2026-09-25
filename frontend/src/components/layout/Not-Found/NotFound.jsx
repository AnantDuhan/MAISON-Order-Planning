import React from 'react';
import { Link } from 'react-router-dom';

import MetaData from '../MetaData';

const NotFound = () => {
    return (
        <div className='editorial-shell flex min-h-[70vh] flex-col items-center justify-center py-24 text-center'>
            <MetaData title='Page Not Found · Maison' />
            <p className='eyebrow'>Error 404</p>
            <h1 className='heading-display mt-4 text-display-lg'>Lost the thread</h1>
            <p className='mt-5 max-w-md font-sans text-ink-soft'>
                The page you're looking for doesn't exist, or has been moved elsewhere.
            </p>
            <div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
                <Link to='/' className='btn-solid'>Return Home</Link>
                <Link to='/products' className='btn-outline'>Browse the Collection</Link>
            </div>
        </div>
    );
};

export default NotFound;

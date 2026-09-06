import React from 'react';

const Loader = () => {
    return (
        <div className='grid min-h-[70vh] w-full place-items-center'>
            <div className='flex flex-col items-center gap-6'>
                <div className='h-16 w-16 animate-spin rounded-full border border-line border-t-brass' />
                <span className='font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                    Loading
                </span>
            </div>
        </div>
    );
};

export default Loader;

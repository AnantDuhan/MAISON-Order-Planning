import React from 'react';

/** Consistent editorial page header + shell for every admin screen. */
const AdminPage = ({ eyebrow = 'Admin', title, action, children }) => {
    return (
        <div className='editorial-shell py-12'>
            <div className='mb-10 flex flex-wrap items-end justify-between gap-4'>
                <div>
                    <p className='eyebrow'>{eyebrow}</p>
                    <h1 className='heading-display mt-2 text-4xl sm:text-5xl'>{title}</h1>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
};

export default AdminPage;

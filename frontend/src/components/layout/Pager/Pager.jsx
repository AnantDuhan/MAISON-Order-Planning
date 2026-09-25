import React from 'react';

// Minimal numbered pager. Replaces the unmaintained react-js-pagination and
// renders the same markup/classes, so the existing .pagination styles in
// styles/theme.css still apply.
const Pager = ({ currentPage, perPage, totalItems, onChange, maxButtons = 7 }) => {
    const totalPages = Math.max(1, Math.ceil((Number(totalItems) || 0) / (Number(perPage) || 1)));
    if (totalPages <= 1) return null;

    // Window of page numbers centred on the current page.
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);

    const pages = [];
    for (let page = start; page <= end; page += 1) pages.push(page);

    return (
        <nav aria-label='Pagination'>
            <ul className='pagination'>
                {pages.map(page => {
                    const active = page === currentPage;
                    return (
                        <li key={page} className={`page-item${active ? ' pageItemActive' : ''}`}>
                            <button
                                type='button'
                                className='page-link'
                                aria-current={active ? 'page' : undefined}
                                onClick={() => !active && onChange(page)}
                            >
                                {page}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default Pager;

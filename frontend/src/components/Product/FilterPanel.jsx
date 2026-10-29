import React, { Fragment } from 'react';

export const PRICE_RANGES = [
    { key: '0-1000', label: 'Under ₹1,000', value: [0, 1000] },
    { key: '1000-5000', label: '₹1,000 – ₹5,000', value: [1000, 5000] },
    { key: '5000-25000', label: '₹5,000 – ₹25,000', value: [5000, 25000] },
    { key: '25000-100000', label: '₹25,000 – ₹1,00,000', value: [25000, 100000] },
    { key: '100000-999999', label: 'Over ₹1,00,000', value: [100000, 999999] },
];

export const RATING_STEPS = [4, 3, 2];

const Star = () => (
    <svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className='text-brass'>
        <path d='M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z' />
    </svg>
);

const Option = ({ active, onClick, children, count, nested = false }) => (
    <li>
        <button
            type='button'
            onClick={onClick}
            aria-pressed={active}
            className={`flex w-full items-center justify-between gap-3 py-2 text-left font-sans text-sm transition-colors duration-300 ${nested ? 'pl-4' : ''} ${active ? 'text-brass' : 'text-ink-soft hover:text-ink'}`}
        >
            <span className='flex items-center gap-2'>
                <span aria-hidden='true' className={`h-1.5 w-1.5 rounded-full transition-colors ${active ? 'bg-brass' : 'bg-transparent'}`} />
                {children}
            </span>
            {count != null && <span className='text-xs text-ink-faint'>{count}</span>}
        </button>
    </li>
);

/**
 * Shop and search filters: category, price range and minimum rating.
 * Clicking the active option again clears it.
 */
const FilterPanel = ({ categoryTree, category, onCategory, priceKey, onPrice, rating, onRating, showCounts = true }) => (
    <div className='space-y-10'>
        <section>
            <h3 className='eyebrow'>Category</h3>
            <ul className='mt-4'>
                <Option active={!category} onClick={() => onCategory('')}>All</Option>
                {categoryTree.map(dept => (
                    <Fragment key={dept._id}>
                        <Option active={category === dept.slug} onClick={() => onCategory(category === dept.slug ? '' : dept.slug)} count={showCounts ? dept.productCount : null}>
                            {dept.name}
                        </Option>
                        {dept.children.filter(c => c.productCount > 0).map(c => (
                            <Option key={c._id} nested active={category === c.slug} onClick={() => onCategory(category === c.slug ? '' : c.slug)} count={showCounts ? c.productCount : null}>
                                {c.name}
                            </Option>
                        ))}
                    </Fragment>
                ))}
            </ul>
        </section>

        <section>
            <h3 className='eyebrow'>Price</h3>
            <ul className='mt-4'>
                {PRICE_RANGES.map(r => (
                    <Option key={r.key} active={priceKey === r.key} onClick={() => onPrice(priceKey === r.key ? '' : r.key)}>
                        {r.label}
                    </Option>
                ))}
            </ul>
        </section>

        <section>
            <h3 className='eyebrow'>Rating</h3>
            <ul className='mt-4'>
                {RATING_STEPS.map(n => (
                    <Option key={n} active={rating === n} onClick={() => onRating(rating === n ? 0 : n)}>
                        <span className='inline-flex items-center gap-1'>{n}<Star /> &amp; up</span>
                    </Option>
                ))}
            </ul>
        </section>
    </div>
);

export default FilterPanel;

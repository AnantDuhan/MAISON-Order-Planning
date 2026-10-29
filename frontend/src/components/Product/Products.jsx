import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, getProduct } from '../../actions/productAction';
import ProductCard from '../Home/ProductCard';
import MetaData from '../layout/MetaData';
import Pager from '../layout/Pager/Pager';
import { useCategories } from '../../utils/useCategories';
import FilterPanel, { PRICE_RANGES } from './FilterPanel';

const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'ratings', label: 'Top rated' },
];
const RELEVANCE = { value: 'relevance', label: 'Most relevant' };

const SkeletonCard = () => (
    <div aria-hidden='true' className='animate-pulse'>
        <div className='aspect-[4/5] bg-surface-2' />
        <div className='mt-4 h-3 w-1/3 bg-surface-2' />
        <div className='mt-3 h-4 w-2/3 bg-surface-2' />
        <div className='mt-3 h-3 w-1/4 bg-surface-2' />
    </div>
);

const Chip = ({ children, onRemove }) => (
    <button
        type='button'
        onClick={onRemove}
        className='inline-flex items-center gap-2 border border-line bg-surface px-3 py-1.5 font-sans text-xs text-ink transition-colors hover:border-brass hover:text-brass'
    >
        {children}
        <span aria-hidden='true' className='text-ink-faint'>✕</span>
        <span className='sr-only'>Remove filter</span>
    </button>
);

/**
 * The shop (/products) and search (/search?keyword=…) share this page.
 * Every filter lives in the URL, so the back button and shared links keep them.
 */
const Products = () => {
    const dispatch = useDispatch();
    const params = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const keyword = (params.keyword || searchParams.get('keyword') || '').trim();
    const isSearch = Boolean(keyword);
    const category = searchParams.get('category') || '';
    const priceKey = PRICE_RANGES.some(r => r.key === searchParams.get('price')) ? searchParams.get('price') : '';
    const rating = [4, 3, 2].includes(Number(searchParams.get('rating'))) ? Number(searchParams.get('rating')) : 0;
    const sortOptions = isSearch ? [RELEVANCE, ...SORT_OPTIONS] : SORT_OPTIONS;
    const sort = sortOptions.some(o => o.value === searchParams.get('sort')) ? searchParams.get('sort') : sortOptions[0].value;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const update = (changes, { keepPage = false } = {}) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
        if (!keepPage) next.delete('page');
        setSearchParams(next, { replace: !('page' in changes) });
    };

    const { categories: categoryTree } = useCategories();
    const activeDept = categoryTree.find(d => d.slug === category || d.children.some(c => c.slug === category));
    const activeName = activeDept
        ? (activeDept.slug === category ? activeDept.name : activeDept.children.find(c => c.slug === category)?.name)
        : '';
    const priceLabel = PRICE_RANGES.find(r => r.key === priceKey)?.label;

    const { products = [], loading, error, resultPerPage, filteredProductsCount } = useSelector(state => state.products);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const gridTop = useRef(null);
    const closeButton = useRef(null);

    useEffect(() => {
        const price = PRICE_RANGES.find(r => r.key === priceKey)?.value;
        dispatch(getProduct({
            keyword,
            page,
            price,
            category,
            ratings: rating,
            sort: sort === RELEVANCE.value ? '' : sort,
            search: isSearch,
        }));
    }, [dispatch, keyword, isSearch, page, priceKey, category, rating, sort]);

    // Show skeletons until this page's own first request finishes, not
    // whatever another page (Home) left in the store.
    const sawLoading = useRef(false);
    useEffect(() => {
        if (loading) sawLoading.current = true;
        else if (sawLoading.current) setHasLoaded(true);
    }, [loading]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
    }, [dispatch, error]);

    // Mobile drawer: lock page scroll, close on Escape, focus the close button.
    useEffect(() => {
        if (!drawerOpen) return undefined;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        closeButton.current?.focus();
        const onKey = e => e.key === 'Escape' && setDrawerOpen(false);
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = overflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [drawerOpen]);

    const goToPage = p => {
        update({ page: p > 1 ? String(p) : '' }, { keepPage: true });
        gridTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const activeCount = [category, priceKey, rating].filter(Boolean).length;
    const clearAll = () => update({ category: '', price: '', rating: '' });
    const total = Number(filteredProductsCount) || 0;
    const countLabel = `${total} ${total === 1 ? 'piece' : 'pieces'}`;
    const firstLoad = !hasLoaded;

    const panel = (
        <FilterPanel
            categoryTree={categoryTree}
            category={category}
            onCategory={value => update({ category: value })}
            priceKey={priceKey}
            onPrice={value => update({ price: value })}
            rating={rating}
            onRating={value => update({ rating: value ? String(value) : '' })}
            showCounts={!isSearch}
        />
    );

    return (
        <Fragment>
            <MetaData title={isSearch ? `Search · "${keyword}" · Maison` : `${activeName || 'Shop'} · Maison`} noIndex={isSearch} />

            <div className='editorial-shell py-12 sm:py-14'>
                {/* Page header */}
                <div className='mb-10 text-center sm:mb-12'>
                    <p className='eyebrow'>
                        {isSearch ? 'Search results' : activeDept && activeName !== activeDept.name ? activeDept.name : 'The Collection'}
                    </p>
                    <h1 className='heading-display mt-3 text-display'>{isSearch ? `“${keyword}”` : activeName || 'Shop All'}</h1>
                </div>

                <div className='grid gap-12 lg:grid-cols-[220px_1fr]'>
                    {/* Filters: sidebar on desktop */}
                    <aside className='hidden lg:block lg:sticky lg:top-28 lg:self-start' aria-label='Filters'>
                        {panel}
                    </aside>

                    <div ref={gridTop} className='min-w-0 scroll-mt-28'>
                        {/* Toolbar */}
                        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4'>
                            <div className='flex items-center gap-4'>
                                <button
                                    type='button'
                                    onClick={() => setDrawerOpen(true)}
                                    className='inline-flex items-center gap-2 border border-ink px-4 py-2.5 font-sans text-xs uppercase tracking-luxe text-ink transition-colors hover:border-brass hover:text-brass lg:hidden'
                                    aria-expanded={drawerOpen}
                                    aria-controls='filter-drawer'
                                >
                                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
                                        <path d='M4 6h16M7 12h10M10 18h4' />
                                    </svg>
                                    Filters{activeCount > 0 && <span className='text-brass'>({activeCount})</span>}
                                </button>
                                <p className='font-sans text-sm text-ink-soft' aria-live='polite'>
                                    {firstLoad ? 'Loading…' : loading ? 'Updating…' : countLabel}
                                </p>
                            </div>
                            <label className='flex items-center gap-2 font-sans text-xs uppercase tracking-luxe text-ink-faint'>
                                <span className='hidden sm:inline'>Sort</span>
                                <span className='relative'>
                                    <select
                                        value={sort}
                                        onChange={e => update({ sort: e.target.value === sortOptions[0].value ? '' : e.target.value })}
                                        className='appearance-none border-b border-ink bg-transparent py-2 pl-1 pr-7 font-sans text-sm normal-case tracking-normal text-ink focus:border-brass focus:outline-none'
                                    >
                                        {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true' className='pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-ink'>
                                        <path d='M6 9l6 6 6-6' />
                                    </svg>
                                </span>
                            </label>
                        </div>

                        {/* Active filters */}
                        {activeCount > 0 && (
                            <div className='mt-4 flex flex-wrap items-center gap-2'>
                                {category && <Chip onRemove={() => update({ category: '' })}>{activeName || category}</Chip>}
                                {priceKey && <Chip onRemove={() => update({ price: '' })}>{priceLabel}</Chip>}
                                {rating > 0 && <Chip onRemove={() => update({ rating: '' })}>{rating}★ &amp; up</Chip>}
                                <button type='button' onClick={clearAll} className='link-reveal ml-1 font-sans text-xs uppercase tracking-luxe'>Clear all</button>
                            </div>
                        )}

                        {/* Grid */}
                        <div className='mt-8'>
                            {firstLoad || (loading && products.length === 0) ? (
                                <div className='grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3'>
                                    {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
                                </div>
                            ) : products.length > 0 ? (
                                <div
                                    aria-busy={loading}
                                    className={`grid grid-cols-1 gap-x-6 gap-y-10 transition-opacity duration-300 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'pointer-events-none opacity-40' : ''}`}
                                >
                                    {products.map(product => <ProductCard key={product._id} product={product} />)}
                                </div>
                            ) : (
                                <div className='py-20 text-center'>
                                    <p className='font-display text-2xl italic text-ink-faint'>
                                        {isSearch && !activeCount
                                            ? `Nothing matches “${keyword}”. Try a broader word.`
                                            : activeName && !priceKey && !rating
                                                ? `Nothing in ${activeName} just yet.`
                                                : 'No pieces match these filters.'}
                                    </p>
                                    {activeCount > 0 && (
                                        <button type='button' onClick={clearAll} className='btn-outline mt-6'>Clear filters</button>
                                    )}
                                </div>
                            )}
                        </div>

                        {Number(resultPerPage) < total && (
                            <div className='mt-16'>
                                <Pager currentPage={page} perPage={Number(resultPerPage)} totalItems={total} onChange={goToPage} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters: drawer on mobile and tablet */}
            <div id='filter-drawer' className={`fixed inset-0 z-[60] lg:hidden ${drawerOpen ? 'visible' : 'invisible'}`} aria-hidden={!drawerOpen}>
                <button
                    type='button'
                    aria-label='Close filters'
                    tabIndex={-1}
                    onClick={() => setDrawerOpen(false)}
                    className={`absolute inset-0 bg-ink/40 transition-opacity duration-500 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
                />
                <div
                    role='dialog'
                    aria-modal='true'
                    aria-label='Filters'
                    className={`absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col bg-canvas shadow-luxe transition-transform duration-500 ease-luxe ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className='flex items-center justify-between border-b border-line px-6 py-5'>
                        <p className='font-display text-2xl text-ink'>Filters</p>
                        <button ref={closeButton} type='button' onClick={() => setDrawerOpen(false)} className='p-1 font-sans text-lg text-ink-soft hover:text-brass' aria-label='Close filters'>
                            ✕
                        </button>
                    </div>
                    <div className='flex-1 overflow-y-auto px-6 py-8'>{panel}</div>
                    <div className='flex gap-3 border-t border-line px-6 py-4'>
                        <button type='button' onClick={clearAll} disabled={!activeCount} className='btn-outline flex-1 px-4'>Clear</button>
                        <button type='button' onClick={() => setDrawerOpen(false)} className='btn-solid flex-[2] px-4'>
                            {loading ? 'Updating…' : `Show ${countLabel}`}
                        </button>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Products;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { useCategories } from '../../utils/useCategories';
import ProductStrip from './ProductStrip';

/*
 * What the shop and search show when nothing matches: the closest product
 * names (for a search), a way out of the filters, the departments, and the
 * best-rated pieces, so the page is never a dead end.
 */

const MIN_PROBE = 3;

/**
 * Shorter versions of the search to look for, most specific first: each word
 * of three or more letters, then the longest word cut down a letter at a time
 * ("headfones" → "headfon", … "hea"), which catches most typos at the end.
 */
export const probesFor = keyword => {
    const words = String(keyword || '').toLowerCase().split(/\s+/).filter(w => w.length >= MIN_PROBE);
    const probes = [...words];
    const longest = [...words].sort((a, b) => b.length - a.length)[0];
    if (longest) {
        for (let n = longest.length - 1; n >= MIN_PROBE; n -= 1) probes.push(longest.slice(0, n));
    }
    return [...new Set(probes)];
};

/** Up to four product names close to the search, or [] when nothing is. */
const useClosestMatches = keyword => {
    const [matches, setMatches] = useState([]);
    useEffect(() => {
        let active = true;
        setMatches([]);
        if (!keyword) return undefined;
        (async () => {
            for (const probe of probesFor(keyword)) {
                try {
                    const { data } = await axios.get(`/api/v1/products/autocomplete?query=${encodeURIComponent(probe)}`);
                    if (!active) return;
                    if (data?.data?.length) {
                        setMatches(data.data.slice(0, 4));
                        return;
                    }
                } catch {
                    return;
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [keyword]);
    return matches;
};

/** The four best-rated pieces (one shared request per visit to this state). */
const usePopular = () => {
    const [products, setProducts] = useState([]);
    useEffect(() => {
        let active = true;
        axios.get('/api/v1/products?sort=ratings&page=1')
            .then(({ data }) => active && setProducts((data.products || []).slice(0, 4)))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);
    return products;
};

const NoResults = ({ keyword, message, filtersActive, onClearFilters }) => {
    const closest = useClosestMatches(filtersActive ? '' : keyword);
    const popular = usePopular();
    const { categories: departments } = useCategories();

    return (
        <div className='border-y border-line py-14 text-center sm:py-16'>
            <p className='font-display text-2xl italic text-ink-soft sm:text-3xl'>{message}</p>

            {filtersActive && (
                <>
                    <p className='mt-3 font-sans text-sm text-ink-faint'>Removing a filter usually brings pieces back.</p>
                    <button type='button' onClick={onClearFilters} className='btn-solid mt-6'>Clear filters</button>
                </>
            )}

            {closest.length > 0 && (
                <div className='mt-8'>
                    <p className='eyebrow'>Did you mean</p>
                    <ul className='mt-4 flex flex-wrap justify-center gap-2'>
                        {closest.map(item => (
                            <li key={item.id}>
                                <Link
                                    to={`/product/${item.id}`}
                                    className='inline-block border border-line bg-surface px-4 py-2.5 font-sans text-sm text-ink transition-colors hover:border-brass hover:text-brass'
                                >
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!filtersActive && keyword && (
                <p className='mx-auto mt-8 max-w-sm font-sans text-sm leading-relaxed text-ink-faint'>
                    Try a single word, like a product type or a colour, or browse a department.
                </p>
            )}

            {departments.length > 0 && (
                <div className='mt-8'>
                    {(filtersActive || !keyword) && <p className='eyebrow'>Or browse</p>}
                    <ul className='mt-4 flex flex-wrap justify-center gap-x-6 gap-y-3'>
                        <li>
                            <Link to='/products' className='link-reveal font-sans text-xs uppercase tracking-luxe'>Shop all</Link>
                        </li>
                        {departments.map(dept => (
                            <li key={dept._id}>
                                <Link to={`/products?category=${encodeURIComponent(dept.slug)}`} className='link-reveal font-sans text-xs uppercase tracking-luxe'>
                                    {dept.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className='text-left'>
                <ProductStrip eyebrow='Loved by customers' title='Our best-rated pieces' products={popular} viewAll='/products?sort=ratings' />
            </div>
        </div>
    );
};

export default NoResults;

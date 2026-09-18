import React, { useMemo, useState } from 'react';
import { Rating } from '@mui/material';
import ReviewCard from './ReviewCard';

const INITIAL_VISIBLE = 6;

// Renders the reviews block: a ratings summary (average + star distribution),
// then the reviews themselves — collapsed to the first 6 with a "Show all"
// toggle and sorting once there are more than 6.
const ReviewsSection = ({ reviews = [] }) => {
    const [expanded, setExpanded] = useState(false);
    const [sort, setSort] = useState('recent');

    const { average, total, distribution } = useMemo(() => {
        const count = reviews.length;
        if (!count) return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
        const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
        const dist = [0, 0, 0, 0, 0]; // index 0 = 1★ … index 4 = 5★
        reviews.forEach(r => {
            const bucket = Math.round(r.rating);
            if (bucket >= 1 && bucket <= 5) dist[bucket - 1] += 1;
        });
        return { average: sum / count, total: count, distribution: dist };
    }, [reviews]);

    const sorted = useMemo(() => {
        const arr = [...reviews];
        if (sort === 'high') arr.sort((a, b) => b.rating - a.rating);
        else if (sort === 'low') arr.sort((a, b) => a.rating - b.rating);
        return arr; // 'recent' keeps original order
    }, [reviews, sort]);

    if (!total) {
        return (
            <div className="border border-line bg-surface-2 px-6 py-10 text-center">
                <p className="font-sans text-sm text-ink-soft">
                    No reviews yet — be the first to share your experience.
                </p>
            </div>
        );
    }

    const hasMany = total > INITIAL_VISIBLE;
    const visible = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);

    return (
        <div>
            {/* Summary */}
            <div className="mb-10 flex flex-col gap-8 border border-line bg-surface p-6 sm:flex-row sm:items-center sm:gap-12 sm:p-8">
                <div className="flex flex-col items-center gap-1 sm:items-start">
                    <span className="font-display text-5xl leading-none text-ink">
                        {average.toFixed(1)}
                    </span>
                    <Rating value={average} precision={0.1} readOnly size="small" />
                    <span className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-soft">
                        {total} review{total === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = distribution[star - 1];
                        const pct = total ? (count / total) * 100 : 0;
                        return (
                            <div key={star} className="flex items-center gap-3">
                                <span className="w-8 text-xs text-ink-soft">{star}★</span>
                                <div className="h-2 flex-1 overflow-hidden rounded bg-surface-2">
                                    <div className="h-full bg-brass" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-10 text-right text-xs tabular-nums text-ink-soft">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Sort control (only when there's enough to sort) */}
            {hasMany && (
                <div className="mb-6 flex items-center justify-end gap-2 text-sm">
                    <label htmlFor="review-sort" className="text-ink-soft">
                        Sort
                    </label>
                    <select
                        id="review-sort"
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        className="border border-line bg-surface px-2 py-1 text-ink focus:outline-none"
                    >
                        <option value="recent">Most recent</option>
                        <option value="high">Highest rated</option>
                        <option value="low">Lowest rated</option>
                    </select>
                </div>
            )}

            {/* Review grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map(review => (
                    <ReviewCard key={review._id} review={review} />
                ))}
            </div>

            {/* Show all / Show less */}
            {hasMany && (
                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setExpanded(x => !x)}
                        className="border border-ink px-6 py-2 text-sm uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-surface"
                    >
                        {expanded ? 'Show less' : `Show all ${total} reviews`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReviewsSection;

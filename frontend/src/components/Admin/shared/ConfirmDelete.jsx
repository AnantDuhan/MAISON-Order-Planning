import DeleteIcon from '@mui/icons-material/Delete';
import React, { useEffect, useState } from 'react';

/**
 * Two-step delete: the first tap asks, the second deletes. Deleting used to
 * happen on a single tap of a small icon next to Edit, which is easy to hit
 * by mistake on a phone. The question clears itself after a few seconds.
 *
 * variant 'icon' (desktop table) or 'button' (mobile cards, 44px tap target).
 */
const ConfirmDelete = ({ onConfirm, what = 'this', variant = 'icon' }) => {
    const [asking, setAsking] = useState(false);

    useEffect(() => {
        if (!asking) return undefined;
        const timer = setTimeout(() => setAsking(false), 5000);
        return () => clearTimeout(timer);
    }, [asking]);

    if (asking) {
        return (
            <span className='inline-flex items-center gap-2' role='group' aria-label={`Delete ${what}?`}>
                <button
                    type='button'
                    onClick={() => { setAsking(false); onConfirm(); }}
                    className='min-h-[40px] border border-danger bg-danger px-3 font-sans text-[0.68rem] uppercase tracking-luxe text-white'
                >
                    Delete
                </button>
                <button
                    type='button'
                    onClick={() => setAsking(false)}
                    className='min-h-[40px] border border-line px-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-soft'
                >
                    Keep
                </button>
            </span>
        );
    }

    if (variant === 'button') {
        return (
            <button
                type='button'
                onClick={() => setAsking(true)}
                className='inline-flex min-h-[40px] items-center gap-1.5 border border-line px-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-soft transition-colors hover:border-danger hover:text-danger'
            >
                <DeleteIcon sx={{ fontSize: 16 }} />
                Delete
            </button>
        );
    }

    return (
        <button
            type='button'
            onClick={() => setAsking(true)}
            className='text-ink-soft hover:text-danger'
            title={`Delete ${what}`}
            aria-label={`Delete ${what}`}
        >
            <DeleteIcon fontSize='small' />
        </button>
    );
};

export default ConfirmDelete;

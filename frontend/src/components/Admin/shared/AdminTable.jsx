import React, { Fragment, useMemo, useState } from 'react';

/**
 * Editorial admin table.
 *
 * columns: [{ key, label, align?, width?, tone?, render? }]
 *   - tone(row)   -> optional tailwind text colour class
 *   - render(row) -> optional custom cell content
 * rows:    array of plain objects (must include a unique `id`)
 *
 * Stacks into labelled cards on mobile, renders as a grid on desktop.
 */
const AdminTable = ({ columns, rows, pageSize = 10, emptyMessage = 'Nothing to show yet.' }) => {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const safePage = Math.min(page, totalPages);

    const pageRows = useMemo(
        () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
        [rows, safePage, pageSize]
    );

    const gridTemplate = columns.map(c => c.width || '1fr').join(' ');

    if (!rows.length) {
        return (
            <p className='py-20 text-center font-display text-2xl italic text-ink-faint'>
                {emptyMessage}
            </p>
        );
    }

    return (
        <Fragment>
            {/* Header (desktop) */}
            <div
                className='hidden gap-4 border-b border-line pb-4 lg:grid'
                style={{ gridTemplateColumns: gridTemplate }}
            >
                {columns.map(col => (
                    <span
                        key={col.key}
                        className={`eyebrow ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                        {col.label}
                    </span>
                ))}
            </div>

            {/* Rows */}
            <div className='divide-y divide-line'>
                {pageRows.map(row => (
                    <div
                        key={row.id}
                        className='grid grid-cols-1 gap-3 py-6 sm:grid-cols-2 lg:gap-4'
                        style={{ gridTemplateColumns: undefined }}
                    >
                        {/* Mobile/tablet: labelled stack. Desktop handled by the inner grid below. */}
                        <div
                            className='contents lg:grid lg:col-span-2 lg:gap-4'
                            style={{ gridTemplateColumns: gridTemplate }}
                        >
                            {columns.map(col => (
                                <div
                                    key={col.key}
                                    className={`flex flex-col gap-1 lg:block ${
                                        col.align === 'right'
                                            ? 'lg:text-right'
                                            : col.align === 'center'
                                            ? 'lg:text-center'
                                            : ''
                                    }`}
                                >
                                    <span className='eyebrow lg:hidden'>{col.label}</span>
                                    <span
                                        className={`break-words font-sans text-sm ${
                                            col.tone ? col.tone(row) : 'text-ink'
                                        }`}
                                    >
                                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pager */}
            {totalPages > 1 && (
                <div className='mt-10 flex items-center justify-center gap-2'>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className='border border-line px-4 py-2 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-soft transition-colors hover:border-brass hover:text-brass disabled:opacity-30'
                    >
                        Prev
                    </button>
                    <span className='px-4 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                        {safePage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className='border border-line px-4 py-2 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-soft transition-colors hover:border-brass hover:text-brass disabled:opacity-30'
                    >
                        Next
                    </button>
                </div>
            )}
        </Fragment>
    );
};

export default AdminTable;

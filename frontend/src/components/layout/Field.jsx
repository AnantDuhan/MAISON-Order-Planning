import React from 'react';

/**
 * A labelled form field: small caps label above an underlined input, the
 * style used across checkout, the address book and account forms.
 * Children are the input/select/textarea (and any prefix like "+91").
 */
const Field = ({ label, hint, className = '', children }) => (
    <label className={`block ${className}`}>
        <span className='flex items-baseline justify-between gap-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
            {label}
            {hint && <span className='normal-case tracking-normal'>{hint}</span>}
        </span>
        <span className='field-row mt-1'>{children}</span>
    </label>
);

export default Field;

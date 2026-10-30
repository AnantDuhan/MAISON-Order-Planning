import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import React from 'react';

// Shared by sign in, register, forgot password and reset password so every
// sign-in screen uses the same boxed, labelled fields.

export const MIN_PASSWORD = 6; // matches the user model

/** A labelled field: the label stays visible above what's typed. */
export const AuthField = ({ id, label, aside, children }) => (
    <div className='border border-line bg-surface px-4 pb-2.5 pt-2.5 transition-colors focus-within:border-ink'>
        <div className='flex items-baseline justify-between gap-3'>
            <label htmlFor={id} className='font-sans text-[0.62rem] uppercase tracking-luxe text-ink-faint'>{label}</label>
            {aside}
        </div>
        {children}
    </div>
);
export const inputClass = 'mt-1 w-full bg-transparent font-sans text-[0.95rem] text-ink placeholder:text-ink-faint/70 focus:outline-none';

export const PasswordInput = ({ id, value, onChange, show, onToggle, autoComplete, placeholder, name }) => (
    <div className='flex items-center gap-3'>
        <input
            id={id}
            name={name}
            type={show ? 'text' : 'password'}
            autoComplete={autoComplete}
            placeholder={placeholder}
            required
            value={value}
            onChange={onChange}
            className={inputClass}
        />
        <button
            type='button'
            onClick={onToggle}
            aria-label={show ? 'Hide password' : 'Show password'}
            className='mt-1 shrink-0 text-ink-faint hover:text-ink'
        >
            {show ? <VisibilityIcon fontSize='small' /> : <VisibilityOffIcon fontSize='small' />}
        </button>
    </div>
);

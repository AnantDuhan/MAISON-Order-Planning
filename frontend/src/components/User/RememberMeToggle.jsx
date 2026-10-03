import React, { useState } from 'react';
import { getRememberMe, setRememberMe } from '../../utils/rememberMe';

/** "Keep me signed in" checkbox, shared by every sign-in method. */
const RememberMeToggle = ({ className = '' }) => {
    const [checked, setChecked] = useState(getRememberMe);

    return (
        <label className={`flex cursor-pointer select-none items-center gap-2 ${className}`}>
            <input
                type='checkbox'
                checked={checked}
                onChange={e => {
                    setChecked(e.target.checked);
                    setRememberMe(e.target.checked);
                }}
                className='h-4 w-4 accent-[#A07C4B]'
            />
            <span className='font-sans text-[0.7rem] uppercase tracking-luxe text-ink-soft'>Keep me signed in</span>
            <span
                className='font-sans text-[0.7rem] normal-case tracking-normal text-ink-faint'
                title={checked
                    ? 'You stay signed in on this browser, even after closing it.'
                    : 'You are signed out when you close this browser. Use this on shared computers.'}
            >
                ⓘ
            </span>
        </label>
    );
};

export default RememberMeToggle;

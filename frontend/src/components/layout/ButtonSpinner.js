import React from 'react';

/**
 * Small inline spinner for use inside buttons while a request is in flight.
 * Inherits the button's text colour via currentColor.
 */
const ButtonSpinner = ({ className = '' }) => (
    <svg
        className={`h-4 w-4 animate-spin ${className}`}
        viewBox='0 0 24 24'
        fill='none'
        aria-hidden='true'
    >
        <circle
            cx='12'
            cy='12'
            r='9'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeOpacity='0.25'
        />
        <path
            d='M21 12a9 9 0 0 0-9-9'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
        />
    </svg>
);

export default ButtonSpinner;

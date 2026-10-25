import { useEffect } from 'react';

// How many menus/sheets are open. While any are, <html data-overlay> is set so
// floating bits (the cookie bar) can step aside instead of covering them.
let openCount = 0;

export const useOverlay = open => {
    useEffect(() => {
        if (!open) return undefined;
        openCount += 1;
        document.documentElement.setAttribute('data-overlay', '');
        return () => {
            openCount = Math.max(0, openCount - 1);
            if (!openCount) document.documentElement.removeAttribute('data-overlay');
        };
    }, [open]);
};

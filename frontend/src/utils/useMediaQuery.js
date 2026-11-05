import { useEffect, useState } from 'react';

/** True while the CSS media query matches; follows changes (rotating, resizing). */
export const useMediaQuery = query => {
    const get = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);
    const [matches, setMatches] = useState(get);
    useEffect(() => {
        const mq = window.matchMedia?.(query);
        if (!mq) return undefined;
        const onChange = () => setMatches(mq.matches);
        onChange();
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, [query]);
    return matches;
};

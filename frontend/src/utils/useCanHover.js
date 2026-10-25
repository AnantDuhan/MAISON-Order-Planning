import { useEffect, useState } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

/** True on devices with a real hover (mouse/trackpad), false on touch screens. */
export const useCanHover = () => {
    const get = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(QUERY).matches);
    const [canHover, setCanHover] = useState(get);
    useEffect(() => {
        const mq = window.matchMedia?.(QUERY);
        if (!mq) return undefined;
        const onChange = () => setCanHover(mq.matches);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);
    return canHover;
};

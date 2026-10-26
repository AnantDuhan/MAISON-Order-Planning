import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

/**
 * The signed-in shopper's membership tier: 'essential' | 'plus', null when
 * not a member, or undefined while it is still being checked.
 * Only shapes what the store shows; the server decides what is charged.
 */
export const useMembershipTier = () => {
    const { isAuthenticated } = useSelector(state => state.user);
    const [tier, setTier] = useState(isAuthenticated ? undefined : null);

    useEffect(() => {
        if (!isAuthenticated) {
            setTier(null);
            return undefined;
        }
        let active = true;
        setTier(undefined);
        axios
            .get('/api/v1/membership/current')
            .then(({ data }) => {
                const m = data.membership;
                const isActive = Boolean(m?.isActive && m.status === 'ACTIVE');
                if (active) setTier(isActive ? (m.tier || 'plus') : null);
            })
            .catch(() => { if (active) setTier(null); });
        return () => { active = false; };
    }, [isAuthenticated]);

    return tier;
};

/** true / false, or undefined while checking. Any tier counts. */
export const useIsMember = () => {
    const tier = useMembershipTier();
    return tier === undefined ? undefined : Boolean(tier);
};

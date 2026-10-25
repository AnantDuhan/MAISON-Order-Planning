import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

/**
 * Whether the signed-in shopper has an active Maison Plus membership:
 * true/false, or undefined while it is still being checked.
 * Only shapes what checkout shows; the server decides what is charged.
 */
export const useIsMember = () => {
    const { isAuthenticated } = useSelector(state => state.user);
    const [isMember, setIsMember] = useState(isAuthenticated ? undefined : false);

    useEffect(() => {
        if (!isAuthenticated) {
            setIsMember(false);
            return undefined;
        }
        let active = true;
        setIsMember(undefined);
        axios
            .get('/api/v1/membership/current')
            .then(({ data }) => {
                const m = data.membership;
                if (active) setIsMember(Boolean(m?.isActive && m.status === 'ACTIVE'));
            })
            .catch(() => { if (active) setIsMember(false); });
        return () => { active = false; };
    }, [isAuthenticated]);

    return isMember;
};

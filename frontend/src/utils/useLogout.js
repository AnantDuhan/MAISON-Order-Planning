import { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { logout } from '../actions/userAction';

/**
 * Sign out the way every logout button should: wait for the server to clear
 * the session, then go home and say so; if the server refuses, stay put and
 * say that instead. Used by the shop header, the admin header and the
 * profile page, so they can't drift apart.
 *
 * `before` runs first (e.g. close an open menu so the toast isn't hidden).
 */
export const useLogout = ({ before } = {}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);
    const busy = useRef(false);
    const beforeRef = useRef(before);
    beforeRef.current = before;

    const signOut = useCallback(async () => {
        if (busy.current) return; // a double tap sends one request
        busy.current = true;
        beforeRef.current?.();
        setSigningOut(true);
        try {
            const signedOut = await dispatch(logout());
            if (signedOut) {
                navigate('/');
                toast.success('Signed out');
            } else {
                toast.error('Could not sign out. Please try again.');
            }
        } finally {
            busy.current = false;
            setSigningOut(false);
        }
    }, [dispatch, navigate]);

    return { signOut, signingOut };
};

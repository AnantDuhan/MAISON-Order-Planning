import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { useFeature } from '../context/FeatureFlagsContext';

/*
 * Guest checkout on the client. A shopper who isn't signed in checks out as
 * a guest: their email and name live in sessionStorage for this tab only
 * (never localStorage), and are cleared once the order is placed.
 */

const CONTACT_KEY = 'maison.guestContact';
const LAST_ORDER_KEY = 'maison.lastGuestOrder';

const read = key => {
    try {
        return JSON.parse(sessionStorage.getItem(key)) || null;
    } catch {
        return null;
    }
};

const write = (key, value) => {
    try {
        if (value) sessionStorage.setItem(key, JSON.stringify(value));
        else sessionStorage.removeItem(key);
    } catch {
        // Private mode or storage full: the checkout still works in this page.
    }
};

/** { email, name } given on the shipping step, or null. */
export const getGuestContact = () => read(CONTACT_KEY);
export const saveGuestContact = contact => write(CONTACT_KEY, contact);
export const clearGuestContact = () => write(CONTACT_KEY, null);

/** The guest order just placed: { id, token, email }, for the success page. */
export const getLastGuestOrder = () => read(LAST_ORDER_KEY);
export const saveLastGuestOrder = order => write(LAST_ORDER_KEY, order);

/** Link to an order's public tracking page. */
export const trackingPath = (id, token) => `/track/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;

/** Sign-up link that keeps a guest order: their email is prefilled. */
export const claimSignupPath = email => `/login?mode=register&email=${encodeURIComponent(email || '')}`;

/**
 * For the checkout steps. Signed-in shoppers check out as usual; signed-out
 * ones as guests, unless guest checkout is switched off (then: sign in).
 * @returns {{ ready: boolean, isGuest: boolean }} ready=false while the
 *   session is still loading or a redirect is on its way.
 */
export const useCheckoutAccess = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useSelector(state => state.user);
    const guestCheckoutOn = useFeature('guestCheckout');
    const blocked = !loading && !isAuthenticated && !guestCheckoutOn;

    useEffect(() => {
        if (blocked) navigate(`/login?redirect=${encodeURIComponent('/shipping')}`, { replace: true });
    }, [blocked, navigate]);

    return { ready: !loading && !blocked, isGuest: !isAuthenticated };
};

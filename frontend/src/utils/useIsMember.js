import axios from 'axios';
import { useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';

/*
 * The signed-in shopper's membership, fetched once and shared.
 *
 * Every component that needs it (header, product cards, product page, cart,
 * checkout, profile) reads this one copy. Before, each one fetched its own,
 * so a page of product cards sent a dozen /membership/current requests, each
 * a Cashfree round trip, and could use up the API rate limit before checkout.
 *
 * The copy is kept for a few minutes and dropped when a different user (or
 * nobody) is signed in. The membership page asks for a fresh one.
 */
const FRESH_MS = 5 * 60 * 1000;

let cache = { owner: null, membership: undefined, at: 0, promise: null };
const listeners = new Set();
const publish = () => listeners.forEach(listener => listener());

/** Who the cached membership belongs to: the user's id, or null when signed out. */
const ownerOf = userState => (userState?.isAuthenticated ? String(userState.user?._id || 'me') : null);

/**
 * The membership for `owner`: { ..., isActive, status, tier } or null.
 * Reuses the cached copy or a request already in flight unless `force`.
 */
export const loadMembership = (owner, { force = false } = {}) => {
    if (!owner) {
        if (cache.owner !== null || cache.membership !== null) {
            cache = { owner: null, membership: null, at: 0, promise: null };
            publish();
        }
        return Promise.resolve(null);
    }
    if (cache.owner !== owner) cache = { owner, membership: undefined, at: 0, promise: null };

    const fresh = cache.membership !== undefined && Date.now() - cache.at < FRESH_MS;
    if (fresh && !force) return Promise.resolve(cache.membership);
    if (cache.promise && !force) return cache.promise;

    const request = axios
        .get('/api/v1/membership/current')
        .then(({ data }) => data?.membership || null)
        // A failed check keeps what we knew (or "not a member"), as before.
        .catch(() => (cache.owner === owner && cache.membership !== undefined ? cache.membership : null))
        .then(membership => {
            if (cache.owner === owner && cache.promise === request) {
                cache = { owner, membership, at: Date.now(), promise: null };
                publish();
            }
            return membership;
        });
    cache.promise = request;
    return request;
};

/** Put a membership the page already has (e.g. after Cashfree returns) into the shared copy. */
export const primeMembership = (owner, membership) => {
    if (!owner) return;
    cache = { owner, membership: membership || null, at: Date.now(), promise: null };
    publish();
};

/** Re-render when the shared membership changes. */
const useSubscription = () => {
    const [, bump] = useReducer(n => n + 1, 0);
    useEffect(() => {
        listeners.add(bump);
        return () => listeners.delete(bump);
    }, []);
};

/** The owner key for the signed-in user (null when signed out). */
export const useMembershipOwner = () => ownerOf(useSelector(state => state.user));

/** The membership object, null when not a member / signed out, undefined while checking. */
export const useMembership = () => {
    const owner = useMembershipOwner();
    useSubscription();
    useEffect(() => {
        loadMembership(owner);
    }, [owner]);
    if (!owner) return null;
    return cache.owner === owner ? cache.membership : undefined;
};

/**
 * The signed-in shopper's membership tier: 'essential' | 'plus', null when
 * not a member, or undefined while it is still being checked.
 * Only shapes what the store shows; the server decides what is charged.
 */
export const useMembershipTier = () => {
    const membership = useMembership();
    if (membership === undefined) return undefined;
    const isActive = Boolean(membership?.isActive && membership.status === 'ACTIVE');
    return isActive ? (membership.tier || 'plus') : null;
};

/** true / false, or undefined while checking. Any tier counts. */
export const useIsMember = () => {
    const tier = useMembershipTier();
    return tier === undefined ? undefined : Boolean(tier);
};

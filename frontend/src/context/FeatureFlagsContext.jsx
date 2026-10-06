import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Storefront view of the admin feature switches (/admin/features).
 * The server enforces every switch; this only hides UI that wouldn't work.
 * Until the first response arrives, the last known values (or "on") are used.
 */
const STORAGE_KEY = 'maison.features';

const readCached = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
};

const FeatureFlagsContext = createContext({ features: {}, refresh: () => {} });

export const FeatureFlagsProvider = ({ children }) => {
    const [features, setFeatures] = useState(readCached);

    // Returns the fresh values, or null if the server couldn't be reached.
    const refresh = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/v1/features');
            const next = data.features || {};
            setFeatures(next);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        } catch {
            // Keep the last known values; the server still enforces the switches.
            return null;
        }
    }, []);

    // Any API call answering 503 MAINTENANCE closes the storefront at once,
    // without waiting for the next /features check.
    useEffect(() => {
        const id = axios.interceptors.response.use(
            response => response,
            error => {
                const { status, data } = error.response || {};
                if (status === 503 && data?.code === 'MAINTENANCE') {
                    setFeatures(current => (current.storefront === false ? current : { ...current, storefront: false }));
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(id);
    }, []);

    // While the shop is closed, check every minute so it reopens on its own.
    const storefrontClosed = features.storefront === false;
    useEffect(() => {
        if (!storefrontClosed) return undefined;
        const timer = setInterval(refresh, 60 * 1000);
        return () => clearInterval(timer);
    }, [storefrontClosed, refresh]);

    useEffect(() => {
        refresh();
        // Pick up admin changes when the shopper comes back to the tab.
        const onFocus = () => refresh();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [refresh]);

    return (
        <FeatureFlagsContext.Provider value={{ features, refresh }}>
            {children}
        </FeatureFlagsContext.Provider>
    );
};

/** true unless the admin has switched the feature off. */
export const useFeature = key => useContext(FeatureFlagsContext).features[key] !== false;

export const useFeatureFlags = () => useContext(FeatureFlagsContext);

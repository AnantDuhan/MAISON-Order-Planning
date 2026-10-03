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

    const refresh = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/v1/features');
            setFeatures(data.features || {});
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.features || {}));
        } catch {
            // Keep the last known values; the server still enforces the switches.
        }
    }, []);

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

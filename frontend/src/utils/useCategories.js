import axios from 'axios';
import { useEffect, useState } from 'react';

// One request per page load for the public tree, shared by every component.
let publicRequest = null;

const fetchPublic = () => {
    if (!publicRequest) {
        publicRequest = axios
            .get('/api/v1/categories')
            .then(({ data }) => data.categories || [])
            .catch(error => {
                publicRequest = null; // try again next time
                throw error;
            });
    }
    return publicRequest;
};

/** Forget the cached tree (after an admin change). */
export const refreshCategories = () => {
    publicRequest = null;
};

/**
 * Store categories as departments with their categories inside:
 * [{ _id, name, slug, description, productCount, displayImage, children: [...] }]
 * `admin: true` also returns hidden ones, fresh each time.
 */
export const useCategories = ({ admin = false } = {}) => {
    const [state, setState] = useState({ categories: [], loading: true, error: null });
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let alive = true;
        const request = admin
            ? axios.get('/api/v1/admin/categories').then(({ data }) => data.categories || [])
            : fetchPublic();
        request
            .then(categories => { if (alive) setState({ categories, loading: false, error: null }); })
            .catch(error => { if (alive) setState({ categories: [], loading: false, error }); });
        return () => { alive = false; };
    }, [admin, version]);

    return { ...state, reload: () => { refreshCategories(); setVersion(v => v + 1); } };
};

/** Flat list of names a product can be filed under, grouped for a <select>. */
export const categoryGroups = tree =>
    tree.map(d => ({ label: d.name, options: [d.name, ...d.children.map(c => c.name)] }));

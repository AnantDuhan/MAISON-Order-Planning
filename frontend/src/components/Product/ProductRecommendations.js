import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from '../Home/ProductCard';
import { addRecentlyViewed, getRecentlyViewed } from '../../utils/recentlyViewed';

// One horizontal, scrollable rail of product cards.
const Rail = ({ title, products }) => {
    if (!products || products.length === 0) return null;
    return (
        <section className='mt-12'>
            <h2
                className='mb-5 text-2xl text-ink'
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
                {title}
            </h2>
            <div className='flex gap-5 overflow-x-auto pb-4'>
                {products.map(p => (
                    <div key={p._id} className='min-w-[220px] max-w-[220px] shrink-0'>
                        <ProductCard product={p} />
                    </div>
                ))}
            </div>
        </section>
    );
};

// Similar Products (same category), You May Also Like (top-rated), and
// Products You Just Viewed (localStorage). Fetches independently of the page's
// main data; failures are non-fatal and the rail simply hides.
const ProductRecommendations = ({ productId, product }) => {
    const [similar, setSimilar] = useState([]);
    const [recommended, setRecommended] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    // Record this product as recently viewed once it's loaded.
    useEffect(() => {
        if (product && product._id) {
            addRecentlyViewed(product);
        }
    }, [product]);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const [sim, rec] = await Promise.all([
                    axios.get(`/api/v1/products/${productId}/similar`),
                    axios.get(`/api/v1/recommendations`),
                ]);
                if (!active) return;
                setSimilar(sim.data.products || []);
                setRecommended(rec.data.products || []);
            } catch {
                // Rails are supplementary — fail silently.
            }
        };

        if (productId) load();

        // Recently viewed, excluding the product currently on screen.
        setRecentlyViewed(getRecentlyViewed().filter(p => p._id !== productId));

        return () => {
            active = false;
        };
    }, [productId]);

    return (
        <div className='mx-auto max-w-7xl px-4 md:px-10'>
            <Rail title='Similar Products' products={similar} />
            <Rail title='You May Also Like' products={recommended} />
            <Rail title='Products You Just Viewed' products={recentlyViewed} />
        </div>
    );
};

export default ProductRecommendations;

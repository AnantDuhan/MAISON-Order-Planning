import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

// Shown instead of "Add to Cart" while a product is out of stock.
const BackInStockButton = ({ productId, isAuthenticated }) => {
    const navigate = useNavigate();
    const [waiting, setWaiting] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !productId) return undefined;
        let active = true;
        axios.get(`/api/v1/product/${productId}/notify-me`)
            .then(({ data }) => active && setWaiting(Boolean(data.waiting)))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [isAuthenticated, productId]);

    const toggle = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setBusy(true);
        try {
            if (waiting) {
                await axios.delete(`/api/v1/product/${productId}/notify-me`);
                setWaiting(false);
                toast.info('You will not be notified about this product.');
            } else {
                const { data } = await axios.post(`/api/v1/product/${productId}/notify-me`);
                setWaiting(true);
                toast.success(data.message || "We'll email you when it's back.");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className='flex flex-col gap-2'>
            <button onClick={toggle} disabled={busy} className={`${waiting ? 'btn-outline' : 'btn-solid'} w-full disabled:opacity-50`}>
                {waiting ? "You'll be notified · Cancel" : 'Notify me when it’s back'}
            </button>
            <p className='font-sans text-xs text-ink-faint'>
                {waiting
                    ? 'We’ll send one email to your account address as soon as it’s restocked.'
                    : 'Get a single email the moment this piece is restocked.'}
            </p>
        </div>
    );
};

export default BackInStockButton;

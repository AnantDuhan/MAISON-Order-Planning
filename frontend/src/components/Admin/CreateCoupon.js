import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PercentIcon from '@mui/icons-material/Percent';
import EventIcon from '@mui/icons-material/Event';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { clearErrors, generateCoupon, resetCouponState } from '../../actions/couponAction';
import MetaData from '../layout/MetaData';
import AdminPage from './shared/AdminPage';
import ButtonSpinner from '../layout/ButtonSpinner';

const CreateCoupon = () => {
    const dispatch = useDispatch();
    const { loading, error, success, coupon } = useSelector(state => state.coupon);

    const [code, setCode] = useState('');
    const [discount, setDiscount] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (success && coupon) {
            toast.success(`Coupon ${coupon.code} created`);
            setCode('');
            setDiscount('');
            setExpiresAt('');
            dispatch(resetCouponState());
        }
    }, [dispatch, error, success, coupon]);

    const submitHandler = e => {
        e.preventDefault();
        if (!code.trim()) {
            toast.error('Enter a coupon code');
            return;
        }
        if (!discount || Number(discount) <= 0) {
            toast.error('Enter a discount greater than 0');
            return;
        }
        // expiresAt is optional; the API defaults to a 7-day window when omitted.
        dispatch(generateCoupon(code.trim(), Number(discount), expiresAt || undefined));
    };

    return (
        <Fragment>
            <MetaData title='Create Coupon · Admin' />
            <AdminPage eyebrow='Admin' title='Create Coupon'>
                <form
                    className='mx-auto max-w-lg border border-line bg-surface p-8 sm:p-10'
                    onSubmit={submitHandler}
                >
                    <div className='flex flex-col gap-6'>
                        <div className='field-row'>
                            <LocalOfferIcon />
                            <input
                                type='text'
                                placeholder='Coupon Code (e.g. WELCOME10)'
                                required
                                value={code}
                                onChange={e => setCode(e.target.value)}
                            />
                        </div>

                        <div className='field-row'>
                            <PercentIcon />
                            <input
                                type='number'
                                min='1'
                                placeholder='Discount (%)'
                                required
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className='eyebrow'>Expires (optional)</label>
                            <div className='field-row mt-3'>
                                <EventIcon />
                                <input
                                    type='date'
                                    value={expiresAt}
                                    onChange={e => setExpiresAt(e.target.value)}
                                />
                            </div>
                            <p className='mt-2 font-sans text-[0.7rem] text-ink-faint'>
                                Leave blank to expire 7 days from now.
                            </p>
                        </div>

                        <button
                            type='submit'
                            disabled={loading}
                            className='btn-solid flex w-full items-center justify-center gap-2 disabled:opacity-40'
                        >
                            {loading && <ButtonSpinner />}
                            {loading ? 'Creating…' : 'Create Coupon'}
                        </button>
                    </div>
                </form>
            </AdminPage>
        </Fragment>
    );
};

export default CreateCoupon;

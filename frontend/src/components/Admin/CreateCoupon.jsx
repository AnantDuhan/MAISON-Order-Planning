import axios from 'axios';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { clearErrors, generateCoupon, resetCouponState } from '../../actions/couponAction';
import MetaData from '../layout/MetaData';
import Field from '../layout/Field';
import AdminPage from './shared/AdminPage';
import ButtonSpinner from '../layout/ButtonSpinner';

const pad = n => String(n).padStart(2, '0');
/** A Date as the yyyy-mm-dd a date input shows, in the admin's own time zone. */
const toDateInput = value => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** The picked day, to the end of it in the admin's time zone, so the coupon works all that day. */
const endOfDay = yyyyMmDd => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59).toISOString();
};
const today = () => toDateInput(new Date());

/**
 * New coupon (/admin/coupon) and edit coupon (/admin/coupon/:id).
 * Editing can change the discount, expiry and audience, and the code while no
 * order has used it; "End now" expires the coupon straight away.
 */
const CreateCoupon = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);
    const { loading: creating, error, success, coupon } = useSelector(state => state.coupon);

    const [code, setCode] = useState('');
    const [discount, setDiscount] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [membersOnly, setMembersOnly] = useState(false);
    // Edit mode: the coupon as loaded (null while loading, false if missing).
    const [original, setOriginal] = useState(isEdit ? null : undefined);
    const [saving, setSaving] = useState(false);
    const [confirmEnd, setConfirmEnd] = useState(false);

    useEffect(() => {
        if (!isEdit) return undefined;
        let alive = true;
        axios.get('/api/v1/admin/coupons')
            .then(({ data }) => {
                if (!alive) return;
                const found = (data?.coupons || []).find(c => c._id === id);
                if (!found) return setOriginal(false);
                setOriginal(found);
                setCode(found.code);
                setDiscount(String(found.discount));
                setExpiresAt(toDateInput(found.expiresAt));
                setMembersOnly(Boolean(found.membersOnly));
            })
            .catch(err => {
                if (!alive) return;
                setOriginal(false);
                toast.error(err.response?.data?.message || 'Could not load the coupon');
            });
        return () => { alive = false; };
    }, [id, isEdit]);

    // Create flow (redux).
    useEffect(() => {
        if (isEdit) return;
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (success && coupon) {
            toast.success(`Coupon ${coupon.code} created`);
            dispatch(resetCouponState());
            // Straight to the list, with the new coupon at the top.
            navigate(`/admin/coupons?created=${encodeURIComponent(coupon.code)}`);
        }
    }, [dispatch, navigate, error, success, coupon, isEdit]);

    const save = async body => {
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/v1/admin/coupon/${encodeURIComponent(id)}`, body);
            const ended = new Date(data.coupon.expiresAt).getTime() <= Date.now();
            toast.success(ended ? `Coupon ${data.coupon.code} ended` : `Coupon ${data.coupon.code} updated`);
            navigate(`/admin/coupons?${ended ? 'tab=expired&' : ''}updated=${encodeURIComponent(data.coupon.code)}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update the coupon');
            setSaving(false);
        }
    };

    const submitHandler = e => {
        e.preventDefault();
        if (!code.trim()) {
            toast.error('Enter a coupon code');
            return;
        }
        const value = Number(discount);
        if (!discount || value <= 0 || value > 100) {
            toast.error('Enter a discount between 1 and 100');
            return;
        }
        if (isEdit) {
            if (!expiresAt) {
                toast.error('Choose an expiry date');
                return;
            }
            const body = { discount: value, expiresAt: endOfDay(expiresAt), membersOnly };
            if (code.trim().toUpperCase() !== original.code) body.code = code.trim();
            save(body);
            return;
        }
        // expiresAt is optional; the API defaults to a 7-day window when omitted.
        dispatch(generateCoupon(code.trim(), value, expiresAt ? endOfDay(expiresAt) : undefined, membersOnly));
    };

    const endNow = () => {
        if (!confirmEnd) {
            setConfirmEnd(true);
            setTimeout(() => setConfirmEnd(false), 4000);
            return;
        }
        save({ expiresAt: new Date().toISOString() });
    };

    const busy = isEdit ? saving : creating;
    const codeLocked = isEdit && original && original.orders > 0;
    const active = isEdit && original && new Date(original.expiresAt).getTime() > Date.now();

    const title = isEdit ? (original ? `Edit ${original.code}` : 'Edit coupon') : 'New coupon';

    return (
        <Fragment>
            <MetaData title={`${isEdit ? 'Edit' : 'New'} Coupon · Admin`} noIndex />
            <AdminPage eyebrow='Coupons' title={title} action={<Link to='/admin/coupons' className='link-reveal font-sans text-xs uppercase tracking-luxe'>All coupons</Link>}>
                {isEdit && original === null ? (
                    <p className='py-16 text-center font-sans text-sm text-ink-faint'>Loading coupon…</p>
                ) : isEdit && original === false ? (
                    <div className='py-16 text-center'>
                        <p className='font-display text-2xl italic text-ink-faint'>This coupon doesn't exist.</p>
                        <Link to='/admin/coupons' className='btn-outline mt-6 inline-flex'>Back to coupons</Link>
                    </div>
                ) : (
                    <form
                        className='mx-auto max-w-lg border border-line bg-surface p-8 sm:p-10'
                        onSubmit={submitHandler}
                    >
                        <div className='flex flex-col gap-6'>
                            {isEdit && (
                                <p className='font-sans text-xs text-ink-faint'>
                                    {original.orders > 0
                                        ? `Used on ${original.orders} ${original.orders === 1 ? 'order' : 'orders'}. Changes apply to future orders only.`
                                        : 'Not used yet.'}
                                    {!active && ' This coupon has ended; set a later expiry to bring it back.'}
                                </p>
                            )}

                            <div>
                                <Field label='Coupon code'>
                                    <input
                                        type='text'
                                        placeholder='e.g. WELCOME10'
                                        required
                                        disabled={codeLocked}
                                        value={code}
                                        onChange={e => setCode(e.target.value)}
                                        className='uppercase disabled:opacity-60'
                                    />
                                </Field>
                                {codeLocked && (
                                    <p className='mt-2 font-sans text-[0.7rem] text-ink-faint'>
                                        The code can't change once orders have used it. Create a new coupon for a new code.
                                    </p>
                                )}
                            </div>

                            <Field label='Discount' hint='% off'>
                                <input
                                    type='number'
                                    min='1'
                                    max='100'
                                    placeholder='10'
                                    required
                                    value={discount}
                                    onChange={e => setDiscount(e.target.value)}
                                />
                            </Field>

                            <div>
                                <Field label={isEdit ? 'Expires' : 'Expires (optional)'}>
                                    <input
                                        type='date'
                                        min={today()}
                                        required={isEdit}
                                        value={expiresAt}
                                        onChange={e => setExpiresAt(e.target.value)}
                                    />
                                </Field>
                                <p className='mt-2 font-sans text-[0.7rem] text-ink-faint'>
                                    {isEdit ? 'Works until the end of this day.' : 'Works until the end of this day. Leave blank to expire 7 days from now.'}
                                </p>
                            </div>

                            <label className='flex items-start gap-3'>
                                <input type='checkbox' checked={membersOnly} onChange={e => setMembersOnly(e.target.checked)} className='mt-1 h-4 w-4 accent-[#A07C4B]' />
                                <span>
                                    <span className='block font-sans text-sm text-ink'>Members only</span>
                                    <span className='block font-sans text-xs text-ink-faint'>Only Essential and Plus members can use this coupon.</span>
                                </span>
                            </label>

                            <button
                                type='submit'
                                disabled={busy}
                                className='btn-solid flex w-full items-center justify-center gap-2 disabled:opacity-40'
                            >
                                {busy && <ButtonSpinner />}
                                {isEdit ? (busy ? 'Saving…' : 'Save changes') : (busy ? 'Creating…' : 'Create Coupon')}
                            </button>

                            {isEdit && active && (
                                <button
                                    type='button'
                                    onClick={endNow}
                                    disabled={busy}
                                    className={`w-full border px-4 py-3 font-sans text-xs uppercase tracking-luxe transition-colors disabled:opacity-40 ${confirmEnd ? 'border-danger bg-danger text-canvas' : 'border-line text-danger hover:border-danger'}`}
                                >
                                    {confirmEnd ? `Tap again to end ${original.code} now` : 'End coupon now'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </AdminPage>
        </Fragment>
    );
};

export default CreateCoupon;

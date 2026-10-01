import React, { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import MetaData from '../layout/MetaData';

// Public page behind the QR code printed on every invoice:
//   /verify/:ref   where ref = "<invoiceId>.<token>"
// Shows what MAISON's records say, so a PDF/paper copy can be compared to it.
// /verify without a ref lets someone paste the link or code by hand.

const REF_PATTERN = /([0-9a-z]{4,32}\.[A-Za-z0-9_-]{22})/;

const formatDate = value =>
    new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const formatAmount = (amount, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

const STATUS_COPY = {
    issued: { label: 'Genuine invoice', tone: 'success', note: 'This invoice was issued by MAISON and has not been altered in our records.' },
    refunded: { label: 'Genuine — refunded', tone: 'brass', note: 'This invoice was issued by MAISON. The order has since been refunded in full.' },
    cancelled: { label: 'Genuine — cancelled', tone: 'brass', note: 'This invoice was issued by MAISON and has since been cancelled.' },
    'integrity-failed': { label: 'Could not be confirmed', tone: 'danger', note: 'Our records for this invoice failed an integrity check. Please contact support before relying on it.' },
};

const toneClasses = {
    success: 'text-success border-success',
    brass: 'text-brass border-brass',
    danger: 'text-danger border-danger',
};

const Row = ({ label, children, mono }) => (
    <div className='flex items-baseline justify-between gap-6 border-b border-line py-3 last:border-b-0'>
        <span className='font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>{label}</span>
        <span className={`text-right text-ink ${mono ? 'font-mono text-xs tracking-wider' : 'font-sans text-sm'}`}>{children}</span>
    </div>
);

const ManualEntry = () => {
    const navigate = useNavigate();
    const [value, setValue] = useState('');
    const [error, setError] = useState('');

    const submit = event => {
        event.preventDefault();
        const match = REF_PATTERN.exec(value.trim());
        if (!match) {
            setError('Paste the full verification link or code printed under the QR code.');
            return;
        }
        navigate(`/verify/${match[1]}`);
    };

    return (
        <div className='mt-10 border border-line bg-surface p-8'>
            <p className='eyebrow'>Check an invoice</p>
            <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                Scan the QR code on the invoice, or paste the verification link printed beside it.
            </p>
            <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
                <input
                    value={value}
                    onChange={e => { setValue(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && submit(e)}
                    placeholder='https://maisonorderplanning.in/verify/…'
                    aria-label='Verification link or code'
                    className='w-full border border-line bg-transparent px-4 py-3 font-sans text-sm text-ink outline-none focus:border-brass'
                />
                <button onClick={submit} className='btn-solid whitespace-nowrap'>Verify</button>
            </div>
            {error && <p className='mt-3 font-sans text-xs text-danger'>{error}</p>}
        </div>
    );
};

const VerifyInvoice = () => {
    const { ref } = useParams();
    const [state, setState] = useState({ phase: ref ? 'loading' : 'idle' });

    useEffect(() => {
        if (!ref) {
            setState({ phase: 'idle' });
            return undefined;
        }
        let active = true;
        setState({ phase: 'loading' });
        axios.get(`/api/v1/invoice/verify/${encodeURIComponent(ref)}`)
            .then(({ data }) => active && setState({ phase: 'done', data }))
            .catch(error => active && setState({
                phase: 'error',
                status: error.response?.status,
                message: error.response?.data?.message,
            }));
        return () => {
            active = false;
        };
    }, [ref]);

    const { phase, data } = state;
    const statusInfo = data && (STATUS_COPY[data.status] || STATUS_COPY.issued);

    return (
        <Fragment>
            <MetaData title='Verify an invoice' />
            <div className='editorial-shell max-w-2xl py-16'>
                <p className='eyebrow'>Invoice verification</p>
                <h1 className='mt-4 font-display text-4xl font-medium text-ink sm:text-5xl'>
                    Is this a genuine MAISON invoice?
                </h1>

                {phase === 'loading' && (
                    <p className='mt-10 font-sans text-sm text-ink-faint'>Checking our records…</p>
                )}

                {phase === 'error' && (
                    <div className='mt-10 border border-danger/40 bg-surface p-8'>
                        <p className='font-sans text-[0.72rem] uppercase tracking-luxe text-danger'>
                            {state.status === 429 ? 'Too many attempts' : state.status === 503 ? 'Unavailable' : 'Not recognised'}
                        </p>
                        <p className='mt-3 font-display text-2xl text-ink'>
                            {state.status === 429 || state.status === 503
                                ? 'Please try again in a few minutes.'
                                : 'We could not find an invoice with this code.'}
                        </p>
                        <p className='mt-3 font-sans text-sm leading-relaxed text-ink-soft'>
                            {state.status === 429 || state.status === 503
                                ? state.message
                                : 'If someone gave you this document as a MAISON invoice, do not rely on it. Check that the full link was scanned or pasted, or contact us.'}
                        </p>
                    </div>
                )}

                {phase === 'done' && data && (
                    <div className='mt-10 border border-line bg-surface p-8'>
                        <div className={`inline-flex items-center gap-2 border-b pb-1 ${toneClasses[statusInfo.tone]}`}>
                            <span className={`h-2 w-2 rounded-full ${statusInfo.tone === 'danger' ? 'bg-danger' : statusInfo.tone === 'success' ? 'bg-success' : 'bg-brass'}`} />
                            <span className='font-sans text-[0.72rem] uppercase tracking-luxe'>
                                {data.isDemo ? 'Demo invoice — not a real purchase' : statusInfo.label}
                            </span>
                        </div>
                        <p className='mt-4 font-sans text-sm leading-relaxed text-ink-soft'>
                            {data.isDemo
                                ? 'This invoice belongs to MAISON\u2019s public demo account and does not represent a real payment.'
                                : statusInfo.note}
                        </p>

                        <div className='mt-8'>
                            <Row label='Invoice number'>{data.invoice.invoiceNumber}</Row>
                            <Row label='Type'>{data.invoice.type === 'membership' ? 'Membership' : 'Order'}</Row>
                            <Row label='Issued on'>{formatDate(data.invoice.issuedAt)}</Row>
                            <Row label='Billed to'>{data.invoice.billedTo || '—'}</Row>
                            <Row label='Amount paid'>
                                <span className='font-display text-xl'>{formatAmount(data.invoice.total, data.invoice.currency)}</span>
                            </Row>
                            {data.status === 'refunded' && data.invoice.statusUpdatedAt && (
                                <Row label='Refunded on'>{formatDate(data.invoice.statusUpdatedAt)}</Row>
                            )}
                            <Row label='Fingerprint' mono>{data.invoice.fingerprint}</Row>
                        </div>

                        <p className='mt-8 font-sans text-xs leading-relaxed text-ink-faint'>
                            Compare these details with your copy. If the number, date, amount or fingerprint
                            differ in any way, the copy you hold has been altered.
                        </p>
                    </div>
                )}

                {(phase === 'idle' || phase === 'error') && <ManualEntry />}

                <p className='mt-10 font-sans text-xs text-ink-faint'>
                    Questions? <Link to='/contact-us' className='text-brass'>Contact MAISON</Link>.
                </p>
            </div>
        </Fragment>
    );
};

export default VerifyInvoice;

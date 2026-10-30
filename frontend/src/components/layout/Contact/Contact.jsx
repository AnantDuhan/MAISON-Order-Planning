import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { clearErrors, submitContactForm } from '../../../actions/contactAction';
import { CLEAR_CONTACT } from '../../../constants/contactConstants';

import { LEGAL_EMAIL } from '../Legal/LegalPage';
import MetaData from '../MetaData';
import ButtonSpinner from '../ButtonSpinner';
import Field from '../Field';

const ContactForm = () => {
    const dispatch = useDispatch();
    const { loading, error, success } = useSelector(state => state.contact);
    const { user } = useSelector(state => state.user);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    // Honeypot: hidden from people, but bots fill every field they find.
    const [website, setWebsite] = useState('');
    const [formError, setFormError] = useState('');

    // Signed-in shoppers don't need to type who they are.
    useEffect(() => {
        if (user?.name) setName(n => n || user.name);
        if (user?.email) setEmail(e => e || user.email);
    }, [user?.name, user?.email]);

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (success) {
            toast.success("Thanks — we've got your message and will reply by email.");
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
            dispatch({ type: CLEAR_CONTACT });
        }
    }, [dispatch, error, success]);

    const submitFormHandler = e => {
        e.preventDefault();
        const payload = {
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
        };
        if (payload.name.length < 2) return setFormError('Please enter your name.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email))
            return setFormError('Please enter a valid email address.');
        if (payload.subject.length < 3) return setFormError('Please add a short subject.');
        if (payload.message.length < 10)
            return setFormError('Your message should be at least 10 characters.');
        setFormError('');
        dispatch(submitContactForm({ ...payload, website }));
    };

    return (
        <Fragment>
            <MetaData title='Contact · Maison' />

            <div className='editorial-shell py-16'>
                <div className='grid gap-16 lg:grid-cols-2'>
                    {/* Copy */}
                    <div className='lg:pt-8'>
                        <p className='eyebrow'>We'd Love to Hear</p>
                        <h1 className='heading-display mt-4 text-display-lg'>Contact Us</h1>
                        <p className='mt-6 max-w-md font-sans text-base leading-relaxed text-ink-soft'>
                            Questions about an order, a piece, or the house itself — write to us
                            and we'll respond personally.
                        </p>
                        <div className='mt-10 rule-luxe' />
                        <p className='mt-10 font-display text-2xl font-light italic text-ink-soft'>
                            “Every message is read by a person, not a queue.”
                        </p>
                        <p className='mt-10 font-sans text-sm text-ink-soft'>
                            Prefer email? Write to{' '}
                            <a href={`mailto:${LEGAL_EMAIL}`} className='text-ink underline underline-offset-4 hover:text-brass'>
                                {LEGAL_EMAIL}
                            </a>
                            .
                        </p>
                    </div>

                    {/* Form */}
                    <div className='border border-line bg-surface p-8 sm:p-10'>
                        <form className='flex flex-col gap-6' onSubmit={submitFormHandler} noValidate>
                            {/* Honeypot — visually hidden, skipped by keyboard and screen readers */}
                            <div aria-hidden='true' className='absolute -left-[9999px] h-0 w-0 overflow-hidden'>
                                <label htmlFor='website'>Website</label>
                                <input
                                    id='website'
                                    name='website'
                                    type='text'
                                    tabIndex={-1}
                                    autoComplete='off'
                                    value={website}
                                    onChange={e => setWebsite(e.target.value)}
                                />
                            </div>
                            <div className='grid gap-6 sm:grid-cols-2'>
                                <Field label='Your name'>
                                    <input type='text' autoComplete='name' maxLength={80} required value={name} onChange={e => setName(e.target.value)} />
                                </Field>
                                <Field label='Email'>
                                    <input type='email' autoComplete='email' maxLength={120} required value={email} onChange={e => setEmail(e.target.value)} />
                                </Field>
                            </div>
                            <Field label='Subject'>
                                <input type='text' maxLength={150} required placeholder='Order number, product name or topic' value={subject} onChange={e => setSubject(e.target.value)} />
                            </Field>

                            <label className='block'>
                                <span className='flex items-baseline justify-between gap-3 font-sans text-[0.68rem] uppercase tracking-luxe text-ink-faint'>
                                    Message
                                    <span className='normal-case tracking-normal'>{message.length}/2000</span>
                                </span>
                                <textarea
                                    required
                                    minLength={10}
                                    maxLength={2000}
                                    placeholder="Tell us what’s on your mind…"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows='6'
                                    className='mt-2 w-full resize-none border border-line bg-transparent p-4 font-sans text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                                ></textarea>
                            </label>

                            {formError && (
                                <p role='alert' className='font-sans text-sm text-danger'>
                                    {formError}
                                </p>
                            )}

                            <button type='submit' disabled={loading} className='btn-solid w-full disabled:opacity-40'>
                                {loading ? (
                                        <>
                                            <ButtonSpinner />
                                            Sending…
                                        </>
                                    ) : (
                                        'Send message'
                                    )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default ContactForm;

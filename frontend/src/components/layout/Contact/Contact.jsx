import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import SubjectIcon from '@mui/icons-material/Subject';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { clearErrors, submitContactForm } from '../../../actions/contactAction';
import { CLEAR_CONTACT } from '../../../constants/contactConstants';

import MetaData from '../MetaData';
import ButtonSpinner from '../ButtonSpinner';

const ContactForm = () => {
    const dispatch = useDispatch();
    const { loading, error, success } = useSelector(state => state.contact);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    // Honeypot: hidden from people, but bots fill every field they find.
    const [website, setWebsite] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }
        if (success) {
            toast.success('Contact form submitted successfully');
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
                            <div className='field-row'>
                                <AccountCircleIcon />
                                <input
                                    type='text'
                                    placeholder='Your Name'
                                    aria-label='Your name'
                                    autoComplete='name'
                                    maxLength={80}
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className='field-row'>
                                <EmailIcon />
                                <input
                                    type='email'
                                    placeholder='Your Email'
                                    aria-label='Your email'
                                    autoComplete='email'
                                    maxLength={120}
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div className='field-row'>
                                <SubjectIcon />
                                <input
                                    type='text'
                                    placeholder='Subject'
                                    aria-label='Subject'
                                    maxLength={150}
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor='contact-message' className='eyebrow'>Your Message</label>
                                <textarea
                                    id='contact-message'
                                    required
                                    minLength={10}
                                    maxLength={2000}
                                    placeholder="Tell us what’s on your mind…"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows='6'
                                    className='mt-3 w-full resize-none border border-line bg-transparent p-4 font-sans text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                                ></textarea>
                            </div>

                            {formError && (
                                <p role='alert' className='font-sans text-sm text-danger'>
                                    {formError}
                                </p>
                            )}
                            <p className='-mt-3 text-right font-sans text-xs text-ink-faint'>
                                {message.length}/2000
                            </p>

                            <button type='submit' disabled={loading} className='btn-solid w-full disabled:opacity-40'>
                                {loading ? (
                                        <>
                                            <ButtonSpinner />
                                            Sending…
                                        </>
                                    ) : (
                                        'Submit'
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

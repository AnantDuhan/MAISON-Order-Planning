import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import SubjectIcon from '@mui/icons-material/Subject';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { clearErrors, submitContactForm } from '../../../actions/contactAction';
import { CLEAR_CONTACT } from '../../../constants/contactConstants';

import MetaData from '../MetaData';

const ContactForm = () => {
    const dispatch = useDispatch();
    const { loading, error, success } = useSelector(state => state.contact);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

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
        const myForm = new FormData();
        myForm.set('name', name);
        myForm.set('email', email);
        myForm.set('subject', subject);
        myForm.set('message', message);
        dispatch(submitContactForm(myForm));
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
                        <form className='flex flex-col gap-6' onSubmit={submitFormHandler}>
                            <div className='field-row'>
                                <AccountCircleIcon />
                                <input
                                    type='text'
                                    placeholder='Your Name'
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
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className='eyebrow'>Your Message</label>
                                <textarea
                                    placeholder="Tell us what’s on your mind…"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows='6'
                                    className='mt-3 w-full resize-none border border-line bg-transparent p-4 font-sans text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none'
                                ></textarea>
                            </div>

                            <button type='submit' disabled={loading} className='btn-solid w-full disabled:opacity-40'>
                                {loading ? 'Sending…' : 'Submit'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default ContactForm;

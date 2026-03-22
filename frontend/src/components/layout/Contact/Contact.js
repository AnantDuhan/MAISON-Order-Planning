import { Button } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import SubjectIcon from '@mui/icons-material/Subject';
import MessageIcon from '@mui/icons-material/Message';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { clearErrors, submitContactForm } from '../../../actions/contactAction';
import { CLEAR_CONTACT } from '../../../constants/contactConstants';

import MetaData from '../MetaData';
import './Contact.css';

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
            <MetaData title='Contact Us' />
            <div className='newContactContainer'>
                <form
                    className='createContactForm'
                    onSubmit={submitFormHandler}
                >
                    <h1>Contact Us</h1>

                    <div>
                        <AccountCircleIcon />
                        <input
                            type='text'
                            placeholder='Your Name'
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <EmailIcon />
                        <input
                            type='email'
                            placeholder='Your Email'
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
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
                        <MessageIcon />
                        <textarea
                            placeholder='Your Message'
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            cols='30'
                            rows='5'
                        ></textarea>
                    </div>

                    <Button
                        type='submit'
                        disabled={loading ? true : false}
                        id='ContactBtn'
                    >
                        Submit
                    </Button>
                </form>
            </div>
        </Fragment>
    );
};

export default ContactForm;

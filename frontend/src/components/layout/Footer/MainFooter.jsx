// Footer.js

import React from 'react';
import './Footer.css';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const Footer = () => {
    const { user } = useSelector(state => state.user);
    return (
        <footer className='footer'>
            <div className='footer-section'>
                <div className='column'>
                    <div className='nav-brand'>
                        <Link to='/'>
                            <img
                                src='https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/Ecommerce-logo.png'
                                alt='order-planning'
                                className='logo-img'
                            />
                        </Link>
                    </div>
                    <p>Order Planning</p>
                </div>
            </div>
            <div className='footer-section'>
                <div className='column'>
                    <h3>MENU</h3>
                    {user?.role === 'admin' && (
                        <Link to='/admin/dashboard' className='footer-links'>
                            Dashboard
                        </Link>
                    )}
                    <Link to='/products' className='footer-links'>
                        Products
                    </Link>
                    <Link to='/orders' className='footer-links'>
                        Orders
                    </Link>
                    <Link to='/contact-us' className='footer-links'>
                        Contact
                    </Link>
                    <Link to='/about' className='footer-links'>
                        About
                    </Link>
                </div>
            </div>
            <div className='footer-section'>
                <div className='column'>
                    <h3>COMPANY</h3>
                    <p>Content for Section 3</p>
                </div>
            </div>
            <div className='footer-section'>
                <div className='column'>
                    <h3>CONTACT</h3>
                    <p>Content for Section 4</p>
                </div>
            </div>
            <div className='footer-section'>
                <div className='column'>
                    <h3>TECH SUPPORT</h3>
                    <p>Content for Section 5</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

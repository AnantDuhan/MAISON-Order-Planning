import React from 'react';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

import MetaData from '../MetaData';

const socials = [
    { icon: <YouTubeIcon />, href: 'https://www.youtube.com/channel/AnantDuhan', label: 'YouTube' },
    { icon: <InstagramIcon />, href: 'https://instagram.com/anantduhan_', label: 'Instagram' },
    { icon: <FacebookIcon />, href: 'https://facebook.com/anantduhan12', label: 'Facebook' },
    { icon: <LinkedInIcon />, href: 'https://www.linkedin.com/in/anantduhan/', label: 'LinkedIn' },
];

const About = () => {
    return (
        <div className='editorial-shell py-16'>
            <MetaData title='About · Maison' />

            {/* Masthead */}
            <div className='mx-auto max-w-3xl text-center'>
                <p className='eyebrow'>Our Story</p>
                <h1 className='heading-display mt-4 text-display-lg'>About Us</h1>
                <p className='mx-auto mt-6 max-w-xl font-display text-2xl font-light italic leading-relaxed text-ink-soft'>
                    “A house built on the belief that fewer, better things are worth the wait.”
                </p>
            </div>

            <div className='mt-16 rule-luxe' />

            {/* Founder */}
            <div className='mt-16 grid items-center gap-14 md:grid-cols-[300px_1fr]'>
                <div className='flex justify-center'>
                    <img
                        src='https://ecommerce-bucket-sdk.s3.ap-south-1.amazonaws.com/Profile+OP.jpeg'
                        alt='Founder'
                        className='h-64 w-64 rounded-full border border-line object-cover'
                    />
                </div>

                <div>
                    <p className='eyebrow'>Founder &amp; CEO</p>
                    <h2 className='heading-display mt-3 text-display'>Anant Duhan</h2>
                    <p className='mt-6 max-w-xl font-sans text-base leading-relaxed text-ink-soft'>
                        This is a MERN stack e-commerce website built by{' '}
                        <a
                            href='https://www.linkedin.com/in/anantduhan/'
                            target='_blank'
                            rel='noreferrer'
                            className='text-brass underline-offset-4 hover:underline'
                        >
                            @anantduhan
                        </a>
                        . I'm a <b className='text-ink'>Full Stack Developer</b> and a{' '}
                        <b className='text-ink'>B.Tech graduate</b> from{' '}
                        <b className='text-ink'>SRM Institute of Science and Technology (2023 batch)</b>.
                    </p>

                    <a
                        href='https://www.linkedin.com/in/anantduhan/'
                        target='_blank'
                        rel='noreferrer'
                        className='btn-outline mt-8 inline-flex'
                    >
                        Visit LinkedIn
                    </a>
                </div>
            </div>

            {/* Brands */}
            <div className='mt-24 text-center'>
                <p className='eyebrow'>Elsewhere</p>
                <h2 className='heading-display mt-3 text-display'>Our Brands</h2>
                <div className='mt-10 flex items-center justify-center gap-8'>
                    {socials.map(s => (
                        <a
                            key={s.label}
                            href={s.href}
                            target='_blank'
                            rel='noreferrer'
                            aria-label={s.label}
                            className='grid h-14 w-14 place-items-center rounded-full border border-line text-ink-soft transition-all duration-500 ease-luxe hover:border-brass hover:text-brass'
                        >
                            {s.icon}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default About;

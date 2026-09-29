import React from 'react';
import { Link } from 'react-router-dom';

import MetaData from '../MetaData';

export const LEGAL_EMAIL = import.meta.env.VITE_LEGAL_EMAIL || 'duhananant@gmail.com';
export const LAST_UPDATED = '29 September 2026';

/** Shared editorial layout for Privacy / Terms. `sections` = [{ heading, body: [node] }]. */
const LegalPage = ({ title, metaTitle, description, intro, sections }) => (
    <div className='editorial-shell py-16'>
        <MetaData title={metaTitle} description={description} />
        <article className='mx-auto max-w-3xl'>
            <p className='eyebrow'>Legal</p>
            <h1 className='heading-display mt-4 text-display-lg'>{title}</h1>
            <p className='mt-4 font-sans text-sm text-ink-faint'>Last updated: {LAST_UPDATED}</p>
            <p className='mt-8 font-sans text-base leading-relaxed text-ink-soft'>{intro}</p>

            {sections.map((s, i) => (
                <section key={s.heading} className='mt-12'>
                    <h2 className='font-display text-2xl font-medium text-ink'>
                        {i + 1}. {s.heading}
                    </h2>
                    <div className='mt-4 flex flex-col gap-4 font-sans text-base leading-relaxed text-ink-soft'>
                        {s.body.map((p, j) => (
                            <p key={j}>{p}</p>
                        ))}
                    </div>
                </section>
            ))}

            <div className='mt-16 rule-luxe' />
            <p className='mt-8 font-sans text-sm text-ink-soft'>
                Questions? Write to{' '}
                <a href={`mailto:${LEGAL_EMAIL}`} className='underline underline-offset-2 text-ink'>
                    {LEGAL_EMAIL}
                </a>{' '}
                or use our{' '}
                <Link to='/contact-us' className='underline underline-offset-2 text-ink'>
                    contact form
                </Link>
                .
            </p>
        </article>
    </div>
);

export default LegalPage;

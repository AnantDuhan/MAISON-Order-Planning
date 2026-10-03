import React, { useId } from 'react';
import './Loader.css';

// The arch of a door: up the left jamb, over the arch, down the right jamb,
// across the threshold. One continuous path so the stitch can travel it.
const DOOR = 'M10 92 V40 A26 26 0 0 1 62 40 V92 Z';

/**
 * MAISON's loader: the house's doorway being sewn in brass stitches around
 * the monogram.
 *
 *   <Loader />                                   full-page, default copy
 *   <Loader label="Gathering the collection" />  full-page, page-specific copy
 *   <Loader inline label="Confirming your payment" />  inside a section
 *   <Loader inline label={null} size='lg' />     the door alone, larger (caption elsewhere)
 */
const Loader = ({ label = 'Opening the doors', inline = false, size }) => {
    const maskId = `maison-thread-${useId().replace(/:/g, '')}`;

    return (
        <div
            className={`maison-loader ${inline ? 'maison-loader--inline' : 'maison-loader--page'}`}
            role='status'
            aria-live='polite'
        >
            <div className='maison-loader__figure'>
                <svg className={`maison-loader__door${size === 'lg' ? ' maison-loader__door--lg' : ''}`} viewBox='0 0 72 100' aria-hidden='true' focusable='false'>
                    <defs>
                        <mask id={maskId} maskUnits='userSpaceOnUse' x='0' y='0' width='72' height='100'>
                            <path className='maison-loader__thread' d={DOOR} pathLength='100' />
                        </mask>
                    </defs>
                    <path className='maison-loader__chalk' d={DOOR} />
                    <path className='maison-loader__stitches' d={DOOR} mask={`url(#${maskId})`} />
                    <text className='maison-loader__monogram' x='36' y='75' textAnchor='middle'>M</text>
                </svg>
                {label && <p className='maison-loader__label'>{label}…</p>}
                <span className='maison-loader__sr'>Loading</span>
            </div>
        </div>
    );
};

export default Loader;

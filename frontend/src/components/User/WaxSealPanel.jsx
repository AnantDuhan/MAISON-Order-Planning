import React, { useEffect, useMemo, useRef } from 'react';

/*
 * The desktop panel beside sign-in: a letter from the house. Paper, an
 * envelope flap, and a brass wax seal pressed with the Maison "M".
 *
 * The seal is lit by an SVG lighting filter (feSpecularLighting with a point
 * light). The light follows the pointer across the panel, so the embossed
 * letter and ring catch the light as you move; the seal tilts slightly too.
 * With reduced motion the light stays put and nothing moves.
 */

const SIZE = 300;
const C = SIZE / 2;

// An irregular wax edge: a circle with a few slow wobbles, like poured wax.
const waxEdge = (radius, points = 96) => {
    const pts = [];
    for (let i = 0; i < points; i += 1) {
        const a = (i / points) * Math.PI * 2;
        const r = radius * (1
            + 0.028 * Math.sin(5 * a + 1.3)
            + 0.017 * Math.sin(9 * a + 0.4)
            + 0.011 * Math.sin(17 * a + 2.1)
            + 0.006 * Math.sin(29 * a));
        pts.push([C + r * Math.cos(a), C + r * Math.sin(a)]);
    }
    return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
};

const ringPath = r => `M ${C - r},${C} a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 ${-2 * r},0`;

const COPY = {
    login: {
        ring: 'MAISON · CHOSEN WITH INTENTION · MADE TO BE KEPT · ',
        eyebrow: 'A note from the house',
        line: 'Welcome back. Everything you keep with us is just as you left it.',
    },
    register: {
        ring: 'MAISON · WELCOME TO THE HOUSE · MADE TO BE KEPT · ',
        eyebrow: 'An invitation',
        line: 'Open an account, and the house keeps your orders, addresses and wishes in order.',
    },
};

const PERKS = ['Every order and return in one place', 'Saved addresses, faster checkout', 'Members: free shipping, 14-day returns'];

const WaxSealPanel = ({ mode = 'login' }) => {
    const panel = useRef(null);
    const light = useRef(null);
    const seal = useRef(null);
    const copy = COPY[mode] || COPY.login;
    const edge = useMemo(() => waxEdge(122), []);

    useEffect(() => {
        const el = panel.current;
        if (!el) return undefined;
        const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (still) return undefined;

        let frame = 0;
        const move = e => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const box = seal.current?.getBoundingClientRect();
                if (!box || !light.current) return;
                // Pointer position relative to the seal, in seal units.
                const x = ((e.clientX - box.left) / box.width) * SIZE;
                const y = ((e.clientY - box.top) / box.height) * SIZE;
                light.current.setAttribute('x', Math.max(-200, Math.min(SIZE + 200, x)).toFixed(0));
                light.current.setAttribute('y', Math.max(-200, Math.min(SIZE + 200, y)).toFixed(0));
                const dx = (x - C) / SIZE;
                const dy = (y - C) / SIZE;
                seal.current.style.transform = `perspective(900px) rotateX(${(-dy * 10).toFixed(2)}deg) rotateY(${(dx * 10).toFixed(2)}deg)`;
            });
        };
        const leave = () => {
            if (light.current) { light.current.setAttribute('x', '60'); light.current.setAttribute('y', '40'); }
            if (seal.current) seal.current.style.transform = '';
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
            cancelAnimationFrame(frame);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
        };
    }, []);

    return (
        <aside ref={panel} className='relative hidden overflow-hidden bg-surface-2 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12 lg:py-16'>
            {/* Paper grain */}
            <svg aria-hidden='true' className='pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-screen'>
                <filter id='maison-paper'>
                    <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch' />
                    <feColorMatrix type='saturate' values='0' />
                </filter>
                <rect width='100%' height='100%' filter='url(#maison-paper)' />
            </svg>

            {/* Envelope flap: two folds meeting under the seal */}
            <svg aria-hidden='true' className='pointer-events-none absolute inset-0 h-full w-full' preserveAspectRatio='none' viewBox='0 0 100 100'>
                <path d='M0,0 L50,40 L100,0' fill='rgb(var(--c-canvas) / 0.35)' stroke='rgb(var(--c-line))' strokeWidth='0.12' vectorEffect='non-scaling-stroke' />
                <path d='M0,100 L42,58 M100,100 L58,58' stroke='rgb(var(--c-line))' strokeWidth='0.12' vectorEffect='non-scaling-stroke' opacity='0.7' />
            </svg>

            <style>{`
                @keyframes maison-seal-press { 0% { opacity: 0; transform: scale(1.18) rotate(-4deg); } 60% { opacity: 1; transform: scale(0.97) rotate(0.5deg); } 100% { transform: scale(1) rotate(0); } }
                .maison-seal-press { animation: maison-seal-press 900ms cubic-bezier(.2,.8,.2,1) both; }
                @media (prefers-reduced-motion: reduce) { .maison-seal-press { animation: none; } .maison-seal { transition: none !important; } }
            `}</style>
            <div className='relative flex flex-col items-center text-center'>
                <div
                    ref={seal}
                    className='maison-seal h-[280px] w-[280px] transition-transform duration-300 ease-out xl:h-[320px] xl:w-[320px]'
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Re-pressed when switching between sign in and create account */}
                    <svg key={mode} viewBox={`0 0 ${SIZE} ${SIZE}`} className='maison-seal-press h-full w-full overflow-visible' role='img' aria-label='Maison wax seal'>
                        <defs>
                            {/* Height map: the letter and ring are pressed in (lower alpha). */}
                            <mask id='maison-engrave' maskUnits='userSpaceOnUse' x='0' y='0' width={SIZE} height={SIZE}>
                                <rect width={SIZE} height={SIZE} fill='#000' />
                                <path d={edge} fill='#fff' />
                                <circle cx={C} cy={C} r='96' fill='none' stroke='#9a9a9a' strokeWidth='2.4' />
                                <circle cx={C} cy={C} r='70' fill='none' stroke='#9a9a9a' strokeWidth='1.4' />
                                <path id='maison-ring' d={ringPath(83)} fill='none' />
                                <text fill='#8a8a8a' fontFamily='"Cormorant Garamond", Georgia, serif' fontSize='13.5' letterSpacing='3.2'>
                                    <textPath href='#maison-ring' startOffset='0'>{copy.ring}{copy.ring.slice(0, 8)}</textPath>
                                </text>
                                <text x={C} y={C + 34} textAnchor='middle' fill='#7a7a7a' fontFamily='"Cormorant Garamond", Georgia, serif' fontSize='104' fontWeight='500'>M</text>
                            </mask>

                            <filter id='maison-wax' x='-15%' y='-15%' width='130%' height='130%' colorInterpolationFilters='sRGB'>
                                <feGaussianBlur in='SourceAlpha' stdDeviation='2.2' result='height' />
                                <feDiffuseLighting in='height' surfaceScale='4' diffuseConstant='1.05' lightingColor='#ffffff' result='diffuse'>
                                    <feDistantLight azimuth='235' elevation='52' />
                                </feDiffuseLighting>
                                <feSpecularLighting in='height' surfaceScale='5' specularConstant='0.95' specularExponent='24' lightingColor='#fff3dc' result='specular'>
                                    <fePointLight ref={light} x='60' y='40' z='170' />
                                </feSpecularLighting>
                                <feComposite in='diffuse' in2='SourceAlpha' operator='in' result='diffuseIn' />
                                <feComposite in='specular' in2='SourceAlpha' operator='in' result='specularIn' />
                                <feBlend in='SourceGraphic' in2='diffuseIn' mode='multiply' result='lit' />
                                <feComposite in='specularIn' in2='lit' operator='arithmetic' k1='0' k2='0.85' k3='1' k4='0' />
                            </filter>

                            <radialGradient id='maison-wax-fill' cx='42%' cy='38%' r='70%'>
                                <stop offset='0' stopColor='#B08A54' />
                                <stop offset='0.55' stopColor='#8C6838' />
                                <stop offset='1' stopColor='#5E4322' />
                            </radialGradient>
                        </defs>

                        {/* Soft shadow on the paper */}
                        <ellipse cx={C + 6} cy={C + 12} rx='124' ry='118' fill='rgb(var(--c-shadow))' opacity='0.22' style={{ filter: 'blur(10px)' }} />
                        <g filter='url(#maison-wax)'>
                            <rect width={SIZE} height={SIZE} fill='url(#maison-wax-fill)' mask='url(#maison-engrave)' />
                        </g>
                    </svg>
                </div>

                <p className='eyebrow mt-10'>{copy.eyebrow}</p>
                <p className='mt-3 max-w-md font-display text-[1.9rem] italic leading-snug text-ink [text-wrap:balance] xl:text-[2.2rem]'>{copy.line}</p>
                <ul className='mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2'>
                    {PERKS.map(perk => (
                        <li key={perk} className='font-sans text-[0.7rem] uppercase tracking-luxe text-ink-soft'>
                            <span aria-hidden='true' className='mr-2 text-brass'>✦</span>{perk}
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};

export default WaxSealPanel;

import React, { useEffect, useMemo, useRef } from 'react';

/*
 * The desktop panel beside sign-in: a letter from the house, sealed in wax.
 *
 * Realism comes from treating the seal as a surface, not a picture: each
 * layer below is drawn as a grey *height map* (lighter = higher), and an SVG
 * lighting filter turns that into lit, glossy red wax. Like a real seal:
 *   - the wax is a poured, irregular blob, wider than the stamp;
 *   - the stamp's face presses a recessed disc, slightly off-centre, and
 *     squeezes a raised lip of wax up around it;
 *   - the design (the "M", the rings, the lettering) stands up out of the
 *     pressed field, because it was cut into the stamp.
 * The point light follows the pointer, so the gloss moves across the wax.
 *
 * On open (and when switching Sign in / Create account) the seal is applied:
 * a pool of hot wax, a brass-and-walnut seal stamp coming down from above
 * (seen from overhead, so it shrinks as it falls and its shadow tightens),
 * a press, and the lift that reveals the impression. Reduced motion: the
 * finished seal, no animation, fixed light.
 */

const SIZE = 300;
const C = SIZE / 2;
// Where the stamp landed: a little off-centre and turned, as by hand.
const DISC = { x: C - 5, y: C + 4, r: 92, turn: -7 };

const blob = (radius, wobble = 1, cx = C, cy = C, points = 120) => {
    const pts = [];
    for (let i = 0; i < points; i += 1) {
        const a = (i / points) * Math.PI * 2;
        const r = radius * (1
            + wobble * (0.045 * Math.sin(2 * a + 0.7)
                + 0.032 * Math.sin(3 * a + 2.2)
                + 0.022 * Math.sin(5 * a + 1.1)
                + 0.012 * Math.sin(11 * a + 0.3)
                + 0.006 * Math.sin(23 * a + 1.9)));
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
};

const ringPath = (cx, cy, r) => `M ${cx - r},${cy} a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 ${-2 * r},0`;

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

const FONT = '"Cormorant Garamond", Georgia, serif';

/** Lit wax from a grey height map (the SourceGraphic's luminance). */
const WaxFilter = ({ id, lightRef, gloss = 1.7, color = '#6E1512' }) => (
    <filter id={id} x='-12%' y='-12%' width='124%' height='124%' colorInterpolationFilters='sRGB'>
        <feColorMatrix in='SourceGraphic' type='luminanceToAlpha' result='lum' />
        <feGaussianBlur in='lum' stdDeviation='1.1' result='fine' />
        <feGaussianBlur in='lum' stdDeviation='7' result='broad' />
        <feComposite in='fine' in2='broad' operator='arithmetic' k1='0' k2='0.62' k3='0.38' k4='0' result='shape' />
        {/* The gentle ripple of cooled wax (smooth, not grainy) */}
        <feTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='2' seed='11' result='noise' />
        <feColorMatrix in='noise' type='luminanceToAlpha' result='noiseA' />
        <feComposite in='shape' in2='noiseA' operator='arithmetic' k1='0' k2='1' k3='0.018' k4='-0.009' result='rippled' />
        {/* Fine dither: breaks up the terracing an 8-bit height map shows under light */}
        <feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='1' seed='3' result='grain' />
        <feColorMatrix in='grain' type='luminanceToAlpha' result='grainA' />
        <feComposite in='rippled' in2='grainA' operator='arithmetic' k1='0' k2='1' k3='0.012' k4='-0.006' result='height' />

        <feDiffuseLighting in='height' surfaceScale='7.5' diffuseConstant='1.2' lightingColor='#ffffff' result='diffuse'>
            <feDistantLight azimuth='225' elevation='50' />
        </feDiffuseLighting>
        <feSpecularLighting in='height' surfaceScale='7.5' specularConstant={gloss} specularExponent='26' lightingColor='#ffe9dc' result='gloss'>
            <fePointLight ref={lightRef} x='70' y='50' z='200' />
        </feSpecularLighting>

        <feFlood floodColor={color} result='wax' />
        <feBlend in='wax' in2='diffuse' mode='multiply' result='direct' />
        {/* A little bounced light, so shaded edges stay deep red, not black */}
        <feComposite in='direct' in2='wax' operator='arithmetic' k1='0' k2='1' k3='0.28' k4='0' result='lit' />
        <feComposite in='lit' in2='SourceAlpha' operator='in' result='litIn' />
        <feComposite in='gloss' in2='SourceAlpha' operator='in' result='glossIn' />
        <feComposite in='glossIn' in2='litIn' operator='arithmetic' k1='0' k2='0.7' k3='1' k4='0' />
    </filter>
);

/** The brass-and-walnut seal stamp, seen from above. */
const Stamp = () => (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className='h-full w-full overflow-visible' aria-hidden='true'>
        <defs>
            <radialGradient id='stamp-brass' cx='38%' cy='34%' r='72%'>
                <stop offset='0' stopColor='#F1D79B' />
                <stop offset='0.35' stopColor='#C89B52' />
                <stop offset='0.75' stopColor='#86602A' />
                <stop offset='1' stopColor='#4A3314' />
            </radialGradient>
            <radialGradient id='stamp-wood' cx='36%' cy='32%' r='75%'>
                <stop offset='0' stopColor='#8A5A36' />
                <stop offset='0.5' stopColor='#5A3520' />
                <stop offset='1' stopColor='#2A170C' />
            </radialGradient>
            <radialGradient id='stamp-shine' cx='30%' cy='26%' r='40%'>
                <stop offset='0' stopColor='#fff' stopOpacity='0.55' />
                <stop offset='1' stopColor='#fff' stopOpacity='0' />
            </radialGradient>
        </defs>
        {/* Brass head and its bevelled rim */}
        <circle cx={C} cy={C} r='112' fill='url(#stamp-brass)' />
        <circle cx={C} cy={C} r='111' fill='none' stroke='#F6E2B0' strokeOpacity='0.6' strokeWidth='1.5' />
        <circle cx={C} cy={C} r='100' fill='none' stroke='#5C4019' strokeOpacity='0.55' strokeWidth='2' />
        {/* Knurled collar */}
        <circle cx={C} cy={C} r='88' fill='none' stroke='#6B4C20' strokeWidth='6' strokeDasharray='2 3' />
        {/* Turned walnut handle, top */}
        <circle cx={C} cy={C} r='74' fill='url(#stamp-wood)' />
        <circle cx={C} cy={C} r='58' fill='none' stroke='#1E1008' strokeOpacity='0.35' strokeWidth='1' />
        <circle cx={C} cy={C} r='112' fill='url(#stamp-shine)' />
    </svg>
);

const WaxSealPanel = ({ mode = 'login' }) => {
    const panel = useRef(null);
    const light = useRef(null);
    const sealBox = useRef(null);
    const copy = COPY[mode] || COPY.login;
    const outer = useMemo(() => blob(128, 1), []);
    const pool = useMemo(() => blob(104, 0.55, C + 2, C - 2), []);

    useEffect(() => {
        const el = panel.current;
        if (!el) return undefined;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

        let frame = 0;
        const move = e => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const box = sealBox.current?.getBoundingClientRect();
                if (!box || !light.current) return;
                const x = ((e.clientX - box.left) / box.width) * SIZE;
                const y = ((e.clientY - box.top) / box.height) * SIZE;
                light.current.setAttribute('x', Math.max(-250, Math.min(SIZE + 250, x)).toFixed(0));
                light.current.setAttribute('y', Math.max(-250, Math.min(SIZE + 250, y)).toFixed(0));
            });
        };
        const leave = () => {
            if (!light.current) return;
            light.current.setAttribute('x', '70');
            light.current.setAttribute('y', '50');
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
            cancelAnimationFrame(frame);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
        };
    }, []);

    const { x, y, r, turn } = DISC;

    return (
        <aside ref={panel} className='relative hidden overflow-hidden bg-surface-2 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12 lg:py-16'>
            <style>{`
                .seal-pool   { animation: seal-pool 2.6s cubic-bezier(.2,.8,.2,1) both; transform-origin: 50% 50%; }
                .seal-final  { animation: seal-final 2.6s linear both; transform-origin: 50% 50%; }
                .seal-stamp  { animation: seal-stamp 2.6s cubic-bezier(.45,0,.2,1) both; transform-origin: 50% 50%; }
                .seal-stamp-shadow { animation: seal-stamp-shadow 2.6s cubic-bezier(.45,0,.2,1) both; transform-origin: 50% 50%; }
                @keyframes seal-pool {
                    0% { opacity: 0; transform: scale(.35); }
                    16% { opacity: 1; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1); }
                    56% { opacity: 0; transform: scale(1.06); }
                    100% { opacity: 0; transform: scale(1.06); }
                }
                @keyframes seal-final {
                    0%, 52% { opacity: 0; transform: scale(.94); }
                    56% { opacity: 1; transform: scale(1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes seal-stamp {
                    0%, 14% { opacity: 0; transform: scale(2.5); filter: blur(10px); }
                    22% { opacity: 1; }
                    48% { transform: scale(1.04); filter: blur(0); }
                    52% { transform: scale(.985); }
                    60% { transform: scale(.99); opacity: 1; filter: blur(0); }
                    88% { transform: scale(2.3); opacity: 0; filter: blur(9px); }
                    100% { transform: scale(2.3); opacity: 0; }
                }
                @keyframes seal-stamp-shadow {
                    0%, 14% { opacity: 0; transform: translate(34px, 46px) scale(1.5); filter: blur(22px); }
                    48% { opacity: .55; transform: translate(4px, 6px) scale(1.02); filter: blur(5px); }
                    60% { opacity: .55; transform: translate(4px, 6px) scale(1.02); filter: blur(5px); }
                    88%, 100% { opacity: 0; transform: translate(34px, 46px) scale(1.4); filter: blur(22px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .seal-pool, .seal-stamp, .seal-stamp-shadow { animation: none; opacity: 0; }
                    .seal-final { animation: none; opacity: 1; }
                }
            `}</style>

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

            <div className='relative flex flex-col items-center text-center'>
                {/* key: the seal is applied again when switching views */}
                <div key={mode} ref={sealBox} className='relative h-[290px] w-[290px] xl:h-[330px] xl:w-[330px]'>
                    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className='absolute inset-0 h-full w-full overflow-visible' role='img' aria-label='A Maison wax seal'>
                        <defs>
                            <WaxFilter id='wax-lit' lightRef={light} />
                            <WaxFilter id='wax-pool' gloss={0.75} color='#5E100E' />
                            <filter id='wax-shadow' x='-20%' y='-20%' width='140%' height='140%'>
                                <feGaussianBlur stdDeviation='3.2' />
                            </filter>
                            <filter id='wax-shadow-soft' x='-30%' y='-30%' width='160%' height='160%'>
                                <feGaussianBlur stdDeviation='9' />
                            </filter>
                        </defs>

                        {/* Hot wax, before the stamp */}
                        <g className='seal-pool'>
                            <path d={pool} transform='translate(3 5)' fill='#000' opacity='0.35' filter='url(#wax-shadow)' />
                            <g filter='url(#wax-pool)'>
                                <path d={pool} fill='#a8a8a8' />
                            </g>
                        </g>

                        {/* The finished seal */}
                        <g className='seal-final'>
                            <path d={outer} transform='translate(5 9)' fill='rgb(var(--c-shadow))' opacity='0.35' filter='url(#wax-shadow-soft)' />
                            <path d={outer} transform='translate(1.5 3)' fill='#000' opacity='0.3' filter='url(#wax-shadow)' />
                            <g filter='url(#wax-lit)'>
                                {/* Height map: lighter is higher */}
                                <path d={outer} fill='#a2a2a2' />
                                {/* The lip of wax squeezed up around the stamp */}
                                <circle cx={x} cy={y} r={r + 7} fill='none' stroke='#dcdcdc' strokeWidth='13' />
                                {/* The pressed field */}
                                <circle cx={x} cy={y} r={r} fill='#6c6c6c' />
                                <g transform={`rotate(${turn} ${x} ${y})`}>
                                    {/* Raised design, cut into the stamp */}
                                    <circle cx={x} cy={y} r={r - 9} fill='none' stroke='#b2b2b2' strokeWidth='2.6' />
                                    <circle cx={x} cy={y} r={r - 36} fill='none' stroke='#a8a8a8' strokeWidth='1.6' />
                                    <path id='seal-ring-path' d={ringPath(x, y, r - 22.5)} fill='none' />
                                    <text fill='#b4b4b4' fontFamily={FONT} fontSize='12.5' fontWeight='600' letterSpacing='2.9'>
                                        <textPath href='#seal-ring-path'>{copy.ring}{copy.ring.slice(0, 6)}</textPath>
                                    </text>
                                    <text x={x} y={y + 30} textAnchor='middle' fill='#c4c4c4' fontFamily={FONT} fontSize='92' fontWeight='600'>M</text>
                                </g>
                            </g>
                        </g>
                    </svg>

                    {/* The seal stamp coming down, pressing, lifting away */}
                    <div aria-hidden='true' className='seal-stamp-shadow pointer-events-none absolute inset-[6%] rounded-full bg-black' />
                    <div aria-hidden='true' className='seal-stamp pointer-events-none absolute inset-[4%]'>
                        <Stamp />
                    </div>
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

import React, { useEffect, useRef, useState } from 'react';

const Arrow = ({ dir, onClick }) => (
    <button
        type='button'
        onClick={onClick}
        aria-label={dir === 'prev' ? 'Previous photo' : 'Next photo'}
        className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-line bg-surface/90 text-ink opacity-0 transition-opacity hover:bg-surface group-hover:opacity-100 lg:flex ${dir === 'prev' ? 'left-4' : 'right-4'}`}
    >
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' aria-hidden='true'>
            <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
        </svg>
    </button>
);

/**
 * Product photos without autoplay (photos used to slide on their own while
 * the shopper was choosing a colour).
 *   Phone/tablet: swipe between photos, with a "2 / 5" counter.
 *   Desktop: thumbnails down the side, the chosen photo large, arrows on hover.
 * Tapping or clicking a photo opens the zoom view at that photo.
 */
const ProductGallery = ({ images, alt, onOpen }) => {
    const [active, setActive] = useState(0);
    const track = useRef(null);
    const thumbs = useRef(null);
    const count = images.length;

    // Keep the active thumbnail in view when there are more than fit.
    useEffect(() => {
        const list = thumbs.current;
        const thumb = list?.children[active];
        if (!list || !thumb) return;
        const top = thumb.offsetTop;
        const bottom = top + thumb.offsetHeight;
        if (top < list.scrollTop) list.scrollTo({ top, behavior: 'smooth' });
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' });
    }, [active]);

    // A new set of photos (another colour) starts from the first one.
    const key = images.map(i => i.url).join('|');
    useEffect(() => {
        setActive(0);
        if (track.current) track.current.scrollTo({ left: 0 });
    }, [key]);

    const go = index => {
        const next = (index + count) % count;
        setActive(next);
        const el = track.current;
        if (el && el.clientWidth) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    };

    const onScroll = () => {
        const el = track.current;
        if (!el || !el.clientWidth) return;
        const index = Math.round(el.scrollLeft / el.clientWidth);
        if (index !== active) setActive(index);
    };

    if (!count) {
        return <div className='aspect-square w-full border border-line bg-surface-2' />;
    }

    return (
        <div className='flex gap-4'>
            {count > 1 && (
                // The column is as tall as the main photo (the list inside is
                // absolutely positioned), and scrolls when there are more
                // thumbnails than fit. Before, eight thumbnails stretched the
                // photo box and left an empty band under the photo.
                <div className='relative hidden w-[76px] shrink-0 lg:block'>
                <div ref={thumbs} className='absolute inset-0 flex flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                    {images.map((img, i) => (
                        <button
                            key={img.url + i}
                            type='button'
                            onClick={() => go(i)}
                            aria-label={`Show photo ${i + 1}`}
                            aria-current={i === active}
                            className={`aspect-[4/5] w-full shrink-0 overflow-hidden border bg-surface-2 transition ${i === active ? 'border-ink' : 'border-line opacity-70 hover:opacity-100'}`}
                        >
                            <img src={img.url} alt='' loading='lazy' decoding='async' className='h-full w-full object-cover' />
                        </button>
                    ))}
                </div>
                </div>
            )}

            <div className='group relative min-w-0 flex-1 self-start overflow-hidden border-y border-line bg-surface-2 sm:border'>
                <div
                    ref={track}
                    onScroll={onScroll}
                    className='flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                >
                    {images.map((img, i) => (
                        <button
                            key={img.url + i}
                            type='button'
                            onClick={() => onOpen(i)}
                            aria-label={`Zoom photo ${i + 1} of ${count}`}
                            className='w-full shrink-0 snap-center cursor-zoom-in'
                        >
                            <img
                                src={img.url}
                                alt={`${alt}, photo ${i + 1}`}
                                loading={i === 0 ? 'eager' : 'lazy'}
                                fetchpriority={i === 0 ? 'high' : undefined}
                                decoding='async'
                                className='aspect-square w-full object-cover'
                            />
                        </button>
                    ))}
                </div>

                {count > 1 && (
                    <>
                        <Arrow dir='prev' onClick={() => go(active - 1)} />
                        <Arrow dir='next' onClick={() => go(active + 1)} />
                        <span className='pointer-events-none absolute bottom-3 right-3 bg-surface/90 px-2 py-1 font-sans text-[0.68rem] tracking-luxe text-ink-soft'>
                            {active + 1} / {count}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductGallery;

/*
 * Responsive product photos. The backend stores each photo at up to 1600px
 * (`url`) plus smaller copies next to it, named with their width
 * ("…-w400.webp"), and lists those widths on the image (backend
 * utils/imageVariants.js). Photos uploaded before that have no `widths`:
 * they just use `url`, as before.
 */

const MAIN_WIDTH = 1600;

/** "…/lamp.webp" → "…/lamp-w400.webp" */
const withWidth = (url, width) => url.replace(/(\.[a-z0-9]+)?([?#].*)?$/i, (_, ext = '', rest = '') => `-w${width}${ext}${rest}`);

/** Grid cards: 1 column on phones, 2 from sm, 3 or 4 on wide screens. */
export const CARD_SIZES = '(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw';
export const CARD_SIZES_4_COL = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw';

/**
 * Props for an <img>: src plus, when smaller copies exist, srcSet and sizes.
 * @param {{url: string, widths?: number[]} | string} image
 * @param {string} sizes  how wide the image shows, as a CSS sizes list
 */
export const imageProps = (image, sizes) => {
    const url = typeof image === 'string' ? image : image?.url;
    const widths = typeof image === 'object' && Array.isArray(image?.widths) ? image.widths : [];
    if (!url || !widths.length) return { src: url };
    const srcSet = [...widths.map(w => `${withWidth(url, w)} ${w}w`), `${url} ${MAIN_WIDTH}w`].join(', ');
    return { src: url, srcSet, sizes };
};

/**
 * Placeholder product photos for seeded data.
 *
 * LoremFlickr (used originally) now answers hotlinked requests with
 * 401 Unauthorized, so every seeded image broke. Lorem Picsum's seeded URLs
 * need no key and always return the same photo for the same seed.
 * Trade-off: Picsum photos are generic, not matched to the product keyword.
 */
const sanitize = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

const placeholderImageUrl = (seed, size = 600) =>
    `https://picsum.photos/seed/${sanitize(seed)}/${size}/${size}`;

// https://loremflickr.com/600/600/yoga,mat?lock=3712713871
const LOREMFLICKR = /^https?:\/\/loremflickr\.com\/(\d+)\/(\d+)\/([^?#]+)(?:\?lock=(\d+))?/i;

/** Equivalent stable Picsum URL for an old LoremFlickr URL, or null. */
const replaceLoremFlickr = url => {
    const match = LOREMFLICKR.exec(String(url || ''));
    if (!match) return null;
    const [, width, , keywords, lock] = match;
    return placeholderImageUrl(`${decodeURIComponent(keywords)}-${lock || '0'}`, Number(width) || 600);
};

module.exports = { placeholderImageUrl, replaceLoremFlickr, LOREMFLICKR };

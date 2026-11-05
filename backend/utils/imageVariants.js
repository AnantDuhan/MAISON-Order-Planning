/**
 * Smaller copies of uploaded photos, for responsive images (srcset).
 *
 * The main image stays as it always was: one WebP up to 1600px, at `url`.
 * Next to it in S3 sit smaller copies with the width in the name:
 *
 *   products/abc/171-0-lamp.webp         1600px (url)
 *   products/abc/171-0-lamp-w400.webp     400px
 *   products/abc/171-0-lamp-w800.webp     800px
 *
 * The image records which copies exist in `widths` ([400, 800]), so the
 * storefront only asks for files that are really there. Images uploaded
 * before this have no `widths` and keep working as before; the backfill
 * script (scripts/backfillImageSizes.js) adds their copies.
 */
const sharp = require('sharp');

const MAX_WIDTH = 1600;
// Card on a phone ≈ 180px css × 2 dpr; card on desktop ≈ 300px × 2; gallery = 1600.
const WIDTHS = [400, 800];
const QUALITY = 80;

/** "…/lamp.webp" → "…/lamp-w400.webp" (works for S3 keys and URLs). */
const withWidth = (keyOrUrl, width) => {
    const match = /^(.*?)(\.[a-z0-9]+)?([?#].*)?$/i.exec(String(keyOrUrl));
    return `${match[1]}-w${width}${match[2] || ''}${match[3] || ''}`;
};

/**
 * Encode a photo: the main WebP plus each smaller width the photo is wide
 * enough for (never enlarged).
 * @returns {Promise<{main: Buffer, width: number, copies: Array<{width: number, buffer: Buffer}>}>}
 */
const renderSizes = async input => {
    const base = sharp(input).rotate(); // respect EXIF orientation
    const main = await base.clone()
        .resize({ width: MAX_WIDTH, height: MAX_WIDTH, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer({ resolveWithObject: true });
    const width = main.info.width;
    const copies = [];
    for (const w of WIDTHS) {
        if (w >= width) continue;
        const buffer = await base.clone()
            .resize({ width: w, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer();
        copies.push({ width: w, buffer });
    }
    return { main: main.data, width, copies };
};

/** Every S3 key belonging to an image: the main file and its copies. */
const keysForImage = (mainKey, widths = []) =>
    mainKey ? [mainKey, ...(widths || []).map(w => withWidth(mainKey, w))] : [];

module.exports = { MAX_WIDTH, WIDTHS, withWidth, renderSizes, keysForImage };

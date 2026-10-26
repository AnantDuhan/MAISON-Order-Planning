// Product photo limits. Keep in step with frontend/src/utils/photoLimits.js.

// Each colour of a product can have up to this many photos, and so can the
// shared photos that aren't tagged to a colour (for products without colours,
// that's the whole limit).
const MAX_PHOTOS_PER_COLOUR = 10;

// Most photos one upload may carry, whatever the colours.
const MAX_REQUEST_PHOTOS = 60;

/**
 * @param {string[]} tags one entry per photo: its colour, or '' when shared
 * @returns {string|null} a message for the admin, or null when within limits
 */
const photoCountError = tags => {
    const counts = new Map();
    for (const tag of tags) {
        const key = String(tag || '');
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    for (const [colour, n] of counts) {
        if (n <= MAX_PHOTOS_PER_COLOUR) continue;
        return colour
            ? `Up to ${MAX_PHOTOS_PER_COLOUR} photos per colour — “${colour}” has ${n}.`
            : `Up to ${MAX_PHOTOS_PER_COLOUR} photos that aren’t tagged to a colour — you have ${n}. Tag some to a colour, or remove a few.`;
    }
    return null;
};

module.exports = { MAX_PHOTOS_PER_COLOUR, MAX_REQUEST_PHOTOS, photoCountError };

import { toast } from 'react-toastify';

// Keep in step with backend/utils/photoLimits.js and MAX_PHOTO_MB in backend/app.js.
export const MAX_PHOTOS_PER_COLOUR = 10;
export const MAX_REQUEST_PHOTOS = 60;
export const MAX_PHOTO_MB = 5;
const TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/** Most photos to pick at once: ten per colour plus ten shared, within the upload cap. */
export const maxPhotosFor = colourCount => Math.min(MAX_REQUEST_PHOTOS, MAX_PHOTOS_PER_COLOUR * ((colourCount || 0) + 1));

/** "Up to 10 per colour (30 here), 5 MB each" — the hint beside "Images". */
export const photoLimitHint = colourCount =>
    colourCount
        ? `up to ${MAX_PHOTOS_PER_COLOUR} per colour, plus ${MAX_PHOTOS_PER_COLOUR} shared · ${MAX_PHOTO_MB} MB each`
        : `up to ${MAX_PHOTOS_PER_COLOUR} · ${MAX_PHOTO_MB} MB each`;

/**
 * Check a photo selection before it is uploaded. Returns the files when they
 * are fine, or null after telling the admin what to change.
 */
export const checkProductPhotos = (fileList, colourCount = 0) => {
    const files = Array.from(fileList || []);
    const max = maxPhotosFor(colourCount);
    if (files.length > max) {
        toast.error(colourCount
            ? `Choose up to ${max} photos — ${MAX_PHOTOS_PER_COLOUR} for each of the ${colourCount} colours plus ${MAX_PHOTOS_PER_COLOUR} shared. You picked ${files.length}.`
            : `Choose up to ${max} photos — you picked ${files.length}. Add a Colour option to upload ${MAX_PHOTOS_PER_COLOUR} per colour.`);
        return null;
    }
    const tooBig = files.filter(f => f.size > MAX_PHOTO_MB * 1024 * 1024 * 4);
    if (tooBig.length) {
        // Photos are shrunk before upload, so only very large originals are refused.
        toast.error(`${tooBig.length === 1 ? `“${tooBig[0].name}” is` : `${tooBig.length} photos are`} over ${MAX_PHOTO_MB * 4} MB. Use smaller photos.`);
        return null;
    }
    const wrongType = files.filter(f => !TYPES.includes(f.type));
    if (wrongType.length) {
        toast.error('Photos must be PNG, JPEG or WebP.');
        return null;
    }
    return files;
};

/**
 * Before submitting: at most ten photos per colour and ten shared.
 * `tags` has one entry per photo: its colour, or '' when shared.
 * Returns true when fine; otherwise shows why and returns false.
 */
export const checkPhotoTags = tags => {
    const counts = new Map();
    tags.forEach(tag => counts.set(tag || '', (counts.get(tag || '') || 0) + 1));
    for (const [colour, n] of counts) {
        if (n <= MAX_PHOTOS_PER_COLOUR) continue;
        toast.error(colour
            ? `Up to ${MAX_PHOTOS_PER_COLOUR} photos per colour — “${colour}” has ${n}.`
            : `Up to ${MAX_PHOTOS_PER_COLOUR} photos that aren’t tagged to a colour — you have ${n}. Tag some to a colour, or remove a few.`);
        return false;
    }
    return true;
};

/**
 * Shrink photos in the browser (longest side 2000 px, WebP) so many photos
 * upload quickly. The server re-compresses anyway; any photo the browser
 * can't read is sent as it is.
 */
export const shrinkPhotos = async files => Promise.all(files.map(async file => {
    try {
        if (file.size < 600 * 1024) return file;
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.86));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    } catch {
        return file;
    }
}));

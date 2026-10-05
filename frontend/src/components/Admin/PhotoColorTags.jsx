import React, { useEffect, useMemo } from 'react';

/**
 * Tag each photo with the colour it shows, or "All colours" for photos that
 * apply to every colour (fabric close-up, size chart). On the product page,
 * choosing a colour shows that colour's photos plus the "All colours" ones.
 *
 * photos: [{ key, src }] in upload order · tags: { key: colour } · colours: ['Black', …]
 */
const PhotoColorTags = ({ title, photos, colours, tags, onChange, accent = false }) => {
    if (!photos.length) return null;
    const missing = colours.filter(c => !photos.some(p => tags[p.key] === c));

    return (
        <div className='mt-5'>
            <p className={`font-sans text-[0.68rem] uppercase tracking-luxe ${accent ? 'text-brass' : 'text-ink-faint'}`}>{title}</p>
            <div className='mt-3 flex flex-wrap gap-4'>
                {photos.map(photo => (
                    <label key={photo.key} className='flex w-24 flex-col gap-1.5'>
                        <img src={photo.src} alt='' className={`h-24 w-24 border object-cover ${accent ? 'border-brass' : 'border-line'}`} />
                        <select
                            value={tags[photo.key] || ''}
                            onChange={e => onChange({ ...tags, [photo.key]: e.target.value })}
                            aria-label='Colour shown in this photo'
                            className='w-full border border-line bg-transparent px-1 py-1 font-sans text-xs text-ink focus:border-brass focus:outline-none'
                        >
                            <option value=''>All colours</option>
                            {colours.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                ))}
            </div>
            {missing.length > 0 && missing.length < colours.length && (
                <p className='mt-2 font-sans text-xs text-ink-faint'>
                    No photo tagged {missing.join(', ')} yet; those colours will show every photo.
                </p>
            )}
        </div>
    );
};

/** Object-URL thumbnails for picked files, in the same order as the files. */
export const useFileThumbnails = files => {
    const photos = useMemo(() => files.map((file, i) => ({ key: String(i), src: URL.createObjectURL(file) })), [files]);
    useEffect(() => () => photos.forEach(p => URL.revokeObjectURL(p.src)), [photos]);
    return photos;
};

export const colourValues = options => (options.find(o => o.kind === 'color')?.values || []).map(v => v.value).filter(Boolean);

export default PhotoColorTags;

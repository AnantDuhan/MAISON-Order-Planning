import React from 'react';

export const MAX_HIGHLIGHTS = 4;

// Placeholder rows per department, so the admin knows what fits there.
const SPEC_HINTS = {
    electronics: [['Display', '6.9-inch Super Retina XDR'], ['Chip', 'A18 Pro'], ['Battery', 'Up to 33 hours video'], ['Weight', '227 g']],
    clothes: [['Material', '100% linen'], ['Fit', 'Relaxed'], ['Care', 'Machine wash cold']],
    shoes: [['Upper', 'Full-grain leather'], ['Sole', 'Rubber'], ['Fit', 'True to size']],
    accessories: [['Material', 'Vegetable-tanned leather'], ['Dimensions', '32 × 24 × 10 cm']],
    home: [['Dimensions', '40 × 40 cm'], ['Material', 'Stoneware'], ['Care', 'Dishwasher safe']],
};
const hintsFor = category => {
    const key = String(category || '').toLowerCase();
    const match = Object.keys(SPEC_HINTS).find(k => key.includes(k));
    return SPEC_HINTS[match] || [['Material', 'e.g. Cotton'], ['Dimensions', 'e.g. 30 × 20 cm']];
};

const input = 'w-full border border-line bg-transparent p-3 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-brass focus:outline-none';

/** Optional key facts and specifications shown on the product page. */
export const toDetailFields = ({ highlights, specs }) => ({
    highlights: JSON.stringify((highlights || []).map(h => h.trim()).filter(Boolean)),
    specs: JSON.stringify((specs || []).filter(r => r.label?.trim() && r.value?.trim())),
});

const ProductDetailsEditor = ({ category, value, onChange }) => {
    const highlights = [...(value.highlights || [])];
    while (highlights.length < MAX_HIGHLIGHTS) highlights.push('');
    const specs = value.specs?.length ? value.specs : [{ label: '', value: '' }];
    const hints = hintsFor(category);

    const setHighlight = (i, text) => {
        const next = [...highlights];
        next[i] = text;
        onChange({ ...value, highlights: next });
    };
    const setSpec = (i, key, text) => {
        const next = specs.map((row, j) => (j === i ? { ...row, [key]: text } : row));
        onChange({ ...value, specs: next });
    };
    const removeSpec = i => onChange({ ...value, specs: specs.filter((_, j) => j !== i) });
    const addSpec = () => onChange({ ...value, specs: [...specs, { label: '', value: '' }] });

    return (
        <div className='grid gap-8'>
            <div>
                <label className='eyebrow'>Highlights <span className='normal-case tracking-normal text-ink-faint'>· optional, up to {MAX_HIGHLIGHTS} short facts shown as tiles</span></label>
                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    {highlights.slice(0, MAX_HIGHLIGHTS).map((text, i) => (
                        <input
                            key={i}
                            type='text'
                            maxLength={60}
                            value={text}
                            onChange={e => setHighlight(i, e.target.value)}
                            placeholder={['e.g. 6.9-inch display', 'e.g. A18 Pro chip', 'e.g. Titanium design', 'e.g. 5× optical zoom'][i]}
                            className={input}
                        />
                    ))}
                </div>
            </div>

            <div>
                <label className='eyebrow'>Specifications <span className='normal-case tracking-normal text-ink-faint'>· optional, shown as a table</span></label>
                <div className='mt-3 grid gap-3'>
                    {specs.map((row, i) => (
                        <div key={i} className='grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2'>
                            <input
                                type='text'
                                maxLength={40}
                                value={row.label}
                                onChange={e => setSpec(i, 'label', e.target.value)}
                                placeholder={hints[i]?.[0] || 'Label'}
                                aria-label={`Specification ${i + 1} name`}
                                className={input}
                            />
                            <input
                                type='text'
                                maxLength={160}
                                value={row.value}
                                onChange={e => setSpec(i, 'value', e.target.value)}
                                placeholder={hints[i]?.[1] || 'Value'}
                                aria-label={`Specification ${i + 1} value`}
                                className={input}
                            />
                            <button
                                type='button'
                                onClick={() => removeSpec(i)}
                                aria-label={`Remove specification ${i + 1}`}
                                className='border border-line px-3 font-sans text-sm text-ink-faint hover:border-danger hover:text-danger'
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
                <button type='button' onClick={addSpec} className='mt-3 font-sans text-[0.72rem] uppercase tracking-luxe text-brass hover:underline'>
                    + Add a row
                </button>
            </div>
        </div>
    );
};

export default ProductDetailsEditor;

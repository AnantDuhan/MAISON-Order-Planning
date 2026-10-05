import React from 'react';

/** The option photos are tagged with: the first colour option. */
export const colorOption = product => (product?.options || []).find(o => o.kind === 'color') || null;

/**
 * Photos for a chosen colour: its own photos, then shared (untagged) ones.
 * All photos when no colour is chosen or the colour has none of its own.
 * Mirrors imagesForColor in backend/utils/productVariants.js.
 */
export const imagesForColor = (product, color) => {
    const images = product?.images || [];
    if (!color) return images;
    const tagged = images.filter(img => img.color === color);
    if (!tagged.length) return images;
    return [...tagged, ...images.filter(img => !img.color)];
};

/** Variants that are for sale. */
export const activeVariants = product => (product?.variants || []).filter(v => v.active !== false);

/** The active variant matching every chosen option, or null. */
export const findSelectedVariant = (product, selection) => {
    const options = product?.options || [];
    if (!options.length || options.some(o => !selection[o.name])) return null;
    return activeVariants(product).find(v => options.every(o => v.options?.[o.name] === selection[o.name])) || null;
};

/**
 * Is `value` worth offering for `optionName`, given what's already chosen in
 * the other options? exists = some variant has it; inStock = one has stock.
 */
const availability = (product, selection, optionName, value) => {
    const others = (product.options || []).filter(o => o.name !== optionName && selection[o.name]);
    const matching = activeVariants(product).filter(v =>
        v.options?.[optionName] === value && others.every(o => v.options?.[o.name] === selection[o.name]));
    return { exists: matching.length > 0, inStock: matching.some(v => v.Stock > 0) };
};

/**
 * Size buttons, colour swatches and text chips for a product's options.
 * Sold-out combinations stay selectable (so the shopper can ask to be told
 * when they're back) but are crossed out.
 */
const VariantPicker = ({ product, selection, onChange }) => (
    <div className='flex flex-col gap-6'>
        {(product.options || []).map(option => (
            <fieldset key={option.name}>
                <legend className='flex items-baseline gap-2 font-sans text-sm text-ink'>
                    <span>{option.name}</span>
                    {selection[option.name] && <span className='text-ink-soft'>· {selection[option.name]}</span>}
                </legend>
                <div className='mt-3 flex flex-wrap gap-2'>
                    {option.values.map(({ value, hex }) => {
                        const { exists, inStock } = availability(product, selection, option.name, value);
                        if (!exists) return null;
                        const selected = selection[option.name] === value;
                        const soldOut = !inStock;
                        const pick = () => onChange({ ...selection, [option.name]: selected ? undefined : value });

                        if (option.kind === 'color') {
                            return (
                                <button
                                    key={value}
                                    type='button'
                                    onClick={pick}
                                    aria-pressed={selected}
                                    aria-label={`${option.name} ${value}${soldOut ? ', sold out' : ''}`}
                                    title={soldOut ? `${value} — sold out` : value}
                                    className={`relative h-9 w-9 rounded-full border p-0.5 transition ${selected ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-canvas' : 'border-line hover:border-ink-soft'}`}
                                >
                                    <span
                                        className={`block h-full w-full rounded-full border border-ink/10 ${soldOut ? 'opacity-40' : ''}`}
                                        style={{ backgroundColor: hex || '#CBB79A' }}
                                    />
                                    {soldOut && (
                                        <span aria-hidden='true' className='absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-ink-soft' />
                                    )}
                                </button>
                            );
                        }

                        return (
                            <button
                                key={value}
                                type='button'
                                onClick={pick}
                                aria-pressed={selected}
                                aria-label={`${option.name} ${value}${soldOut ? ', sold out' : ''}`}
                                className={`min-w-[3rem] border px-4 py-2 font-sans text-sm transition ${selected ? 'border-ink bg-ink text-canvas' : 'border-line text-ink hover:border-ink-soft'} ${soldOut ? 'text-ink-faint line-through decoration-ink-faint' : ''}`}
                            >
                                {value}
                            </button>
                        );
                    })}
                </div>
            </fieldset>
        ))}
    </div>
);

export default VariantPicker;

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
 * First colour that has stock, so the gallery and price start on something
 * buyable. Only colour is pre-picked: sizes and other options stay for the
 * shopper to choose, so nobody gets a size they never chose.
 */
export const defaultSelection = product => {
    const preset = {};
    for (const option of product?.options || []) {
        if (option.values.length === 1) preset[option.name] = option.values[0].value;
    }
    const colour = colorOption(product);
    if (colour && !preset[colour.name]) {
        const inStock = colour.values.find(({ value }) =>
            activeVariants(product).some(v => v.options?.[colour.name] === value && v.Stock > 0));
        if (inStock) preset[colour.name] = inStock.value;
    }
    return preset;
};

/**
 * Size buttons, colour swatches and text chips for a product's options.
 * Sold-out combinations stay selectable (so the shopper can ask to be told
 * when they're back) but are marked "Sold out". `missing` lists options the
 * shopper still has to choose after trying to add to the bag.
 */
const VariantPicker = ({ product, selection, onChange, missing = [] }) => (
    <div className='flex flex-col gap-6'>
        {(product.options || []).map(option => {
            const chosen = selection[option.name];
            const chosenSoldOut = chosen && !availability(product, selection, option.name, chosen).inStock;
            const needsChoice = !chosen && missing.includes(option.name);
            return (
            <fieldset key={option.name}>
                <legend className='flex flex-wrap items-baseline gap-x-1.5 font-sans text-sm text-ink-soft'>
                    <span>{option.name}{chosen ? ':' : ''}</span>
                    {chosen && <span className='font-medium text-ink'>{chosen}</span>}
                    {chosenSoldOut && <span className='text-danger'>· sold out</span>}
                    {needsChoice && <span role='alert' className='text-danger'>· please choose {option.name.toLowerCase()}</span>}
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
                                    className={`relative h-10 w-10 rounded-full border p-0.5 transition ${selected ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-canvas' : 'border-line hover:border-ink-soft'}`}
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
                                className={`min-h-[44px] min-w-[3.25rem] border px-4 font-sans text-sm transition ${selected ? 'border-ink bg-surface text-ink ring-1 ring-inset ring-ink' : `border-line hover:border-ink-soft ${soldOut ? 'text-ink-faint' : 'bg-surface text-ink'}`} ${needsChoice ? 'border-danger/60' : ''}`}
                            >
                                <span className={soldOut ? 'line-through decoration-ink-faint' : ''}>{value}</span>
                                {soldOut && <span className='ml-1.5 align-middle font-sans text-[0.58rem] uppercase tracking-luxe'>Sold out</span>}
                            </button>
                        );
                    })}
                </div>
            </fieldset>
            );
        })}
    </div>
);

export default VariantPicker;

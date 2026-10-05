/**
 * Product options (Size, Colour, …) and variants (each combination, with its
 * own stock, optional price and SKU).
 *
 * A product with no options behaves exactly as before: product.Stock and
 * product.price are the source of truth. A product with options keeps
 * product.Stock as the sum of its variants' stock (kept in step by every
 * stock movement) and product.price as the default price variants inherit.
 */
const generateId = require('./generateId');

const MAX_OPTIONS = 3;
const MAX_VALUES = 20;
const MAX_VARIANTS = 100;

class VariantError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
    }
}

// ---- Category templates ---------------------------------------------------------
// Suggestions shown in the admin form when a category is picked. The admin can
// edit, remove or add options on any product, so new categories work too.
const SIZES_APPAREL = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLOURS = [
    { value: 'Black', hex: '#1A1816' }, { value: 'White', hex: '#F7F4EF' },
    { value: 'Sand', hex: '#CBB79A' }, { value: 'Navy', hex: '#1F2A44' },
];

const TEMPLATES = [
    { match: /jean|trouser|bottom|pant|short/i, options: [
        { name: 'Waist', kind: 'size', values: ['28', '30', '32', '34', '36', '38'].map(value => ({ value })) },
        { name: 'Colour', kind: 'color', values: COLOURS },
    ] },
    { match: /top|shirt|tee|attire|dress|track|cloth|apparel|jacket|kurta|hoodie/i, options: [
        { name: 'Size', kind: 'size', values: SIZES_APPAREL.map(value => ({ value })) },
        { name: 'Colour', kind: 'color', values: COLOURS },
    ] },
    { match: /foot|shoe|sneaker|boot|sandal/i, options: [
        { name: 'Size (UK)', kind: 'size', values: ['5', '6', '7', '8', '9', '10', '11'].map(value => ({ value })) },
        { name: 'Colour', kind: 'color', values: COLOURS },
    ] },
    { match: /phone|mobile/i, options: [
        { name: 'Storage', kind: 'text', values: ['128 GB', '256 GB', '512 GB'].map(value => ({ value })) },
        { name: 'Colour', kind: 'color', values: COLOURS.slice(0, 2) },
    ] },
    { match: /laptop|computer/i, options: [
        { name: 'Memory', kind: 'text', values: ['8 GB', '16 GB', '32 GB'].map(value => ({ value })) },
        { name: 'Storage', kind: 'text', values: ['256 GB', '512 GB', '1 TB'].map(value => ({ value })) },
    ] },
    { match: /camera/i, options: [
        { name: 'Kit', kind: 'text', values: ['Body only', 'With 18–55 mm lens'].map(value => ({ value })) },
    ] },
    { match: /liquor|wine|spirit|perfume|fragrance/i, options: [
        { name: 'Volume', kind: 'text', values: ['375 ml', '750 ml', '1 L'].map(value => ({ value })) },
    ] },
];

const templateForCategory = category => {
    const found = TEMPLATES.find(t => t.match.test(String(category || '')));
    return found ? found.options : [];
};

// ---- Validation -----------------------------------------------------------------

const clean = (v, max = 30) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const HEX = /^#[0-9a-f]{6}$/i;

/** Validate and tidy the option definitions sent by the admin form. */
const normalizeOptions = raw => {
    if (raw == null || raw === '') return [];
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) throw new VariantError('Options must be a list');
    if (list.length > MAX_OPTIONS) throw new VariantError(`At most ${MAX_OPTIONS} options per product`);

    const seen = new Set();
    return list.map((option, i) => {
        const name = clean(option?.name);
        if (!name) throw new VariantError(`Option ${i + 1} needs a name`);
        if (seen.has(name.toLowerCase())) throw new VariantError(`Option "${name}" is listed twice`);
        seen.add(name.toLowerCase());

        const kind = ['size', 'color', 'text'].includes(option?.kind) ? option.kind : 'text';
        const values = (Array.isArray(option?.values) ? option.values : []).map(v => (typeof v === 'string' ? { value: v } : v));
        if (!values.length) throw new VariantError(`Option "${name}" needs at least one value`);
        if (values.length > MAX_VALUES) throw new VariantError(`Option "${name}" has more than ${MAX_VALUES} values`);

        const valueSeen = new Set();
        return {
            name,
            kind,
            values: values.map(v => {
                const value = clean(v?.value);
                if (!value) throw new VariantError(`Option "${name}" has an empty value`);
                if (valueSeen.has(value.toLowerCase())) throw new VariantError(`"${value}" appears twice in "${name}"`);
                valueSeen.add(value.toLowerCase());
                const hex = kind === 'color' && HEX.test(String(v?.hex || '')) ? v.hex.toUpperCase() : undefined;
                return { value, ...(hex && { hex }) };
            }),
        };
    });
};

const comboKey = (options, selection) => options.map(o => `${o.name}=${selection[o.name]}`).join('|');

/** Validate variants against the options. Every combination listed must be complete and unique. */
const normalizeVariants = (raw, options, existing = []) => {
    if (!options.length) return [];
    const list = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
    if (!Array.isArray(list) || !list.length) throw new VariantError('Add at least one variant (a combination of options)');
    if (list.length > MAX_VARIANTS) throw new VariantError(`At most ${MAX_VARIANTS} variants per product`);

    const known = new Set((existing || []).map(v => String(v._id)));
    const keys = new Set();
    const skus = new Set();

    return list.map((variant, i) => {
        const selection = {};
        for (const option of options) {
            const picked = clean(variant?.options?.[option.name]);
            const match = option.values.find(v => v.value.toLowerCase() === picked.toLowerCase());
            if (!match) throw new VariantError(`Variant ${i + 1}: choose a ${option.name}`);
            selection[option.name] = match.value;
        }
        const key = comboKey(options, selection);
        if (keys.has(key)) throw new VariantError(`The combination ${Object.values(selection).join(' / ')} is listed twice`);
        keys.add(key);

        const stock = Number(variant?.Stock ?? variant?.stock ?? 0);
        if (!Number.isInteger(stock) || stock < 0) throw new VariantError(`Variant ${Object.values(selection).join(' / ')}: stock must be a whole number ≥ 0`);

        const rawPrice = variant?.price;
        const price = rawPrice === '' || rawPrice == null ? null : Number(rawPrice);
        if (price !== null && !(price > 0)) throw new VariantError(`Variant ${Object.values(selection).join(' / ')}: price must be positive or left empty`);

        const sku = clean(variant?.sku, 40);
        if (sku) {
            if (skus.has(sku.toLowerCase())) throw new VariantError(`SKU "${sku}" is used twice`);
            skus.add(sku.toLowerCase());
        }

        // Keep ids of variants that already exist, so carts/holds pointing at them stay valid.
        const id = variant?._id && known.has(String(variant._id)) ? String(variant._id) : generateId();
        return { _id: id, options: selection, price, Stock: stock, sku: sku || undefined, active: variant?.active !== false };
    });
};

/** Derived product fields for a product with variants. */
const summarize = (variants, basePrice) => {
    const active = variants.filter(v => v.active !== false);
    const prices = active.map(v => (v.price ?? basePrice));
    return {
        Stock: active.reduce((n, v) => n + (v.Stock || 0), 0),
        priceFrom: prices.length ? Math.min(...prices) : basePrice,
        priceTo: prices.length ? Math.max(...prices) : basePrice,
    };
};

/**
 * Turn form/JSON input into the fields to save: options, variants and the
 * derived Stock/price range. For products without options, nothing changes.
 */
const buildVariantFields = ({ options: rawOptions, variants: rawVariants, price, existingVariants }) => {
    const options = normalizeOptions(rawOptions);
    if (!options.length) return { options: [], variants: [], priceFrom: null, priceTo: null };
    const variants = normalizeVariants(rawVariants, options, existingVariants);
    return { options, variants, ...summarize(variants, Number(price)) };
};

// ---- Reading -----------------------------------------------------------------------

const hasVariants = product => Array.isArray(product?.variants) && product.variants.length > 0;

const findVariant = (product, variantId) =>
    (product?.variants || []).find(v => String(v._id) === String(variantId));

const variantPrice = (product, variant) => (variant?.price ?? product.price);

const selectionOf = variant => {
    const o = variant?.options;
    if (!o) return {};
    return o instanceof Map ? Object.fromEntries(o) : (typeof o.toObject === 'function' ? o.toObject() : o);
};

/** "Size: M · Colour: Black", in the product's option order. */
const variantLabel = (product, variant) => {
    if (!variant) return '';
    const selection = selectionOf(variant);
    return (product?.options || [])
        .map(o => (selection[o.name] ? `${o.name}: ${selection[o.name]}` : null))
        .filter(Boolean)
        .join(' · ');
};

// ---- Colour ↔ photos ---------------------------------------------------------------
// Photos are tagged with a value of the product's colour option, not with each
// variant: a shirt in 6 sizes × 4 colours has 24 variants but 4 sets of photos.

/** The option whose values photos are tagged with: the first colour option. */
const colorOption = product => (product?.options || []).find(o => o.kind === 'color') || null;

/**
 * Photos to show for a chosen colour: that colour's photos, then the shared
 * (untagged) ones. Falls back to every photo if the colour has none, so the
 * gallery is never empty.
 */
const imagesForColor = (product, color) => {
    const images = product?.images || [];
    if (!color) return images;
    const tagged = images.filter(img => img.color === color);
    if (!tagged.length) return images;
    return [...tagged, ...images.filter(img => !img.color)];
};

const imagesForVariant = (product, variant) => {
    const option = colorOption(product);
    return option ? imagesForColor(product, selectionOf(variant)[option.name]) : (product?.images || []);
};

/**
 * Keep only tags that name an existing colour (case-insensitive, stored in the
 * option's spelling). Untagged when there is no colour option.
 */
const cleanImageColors = (images, options) => {
    const option = (options || []).find(o => o.kind === 'color');
    const byLower = new Map((option?.values || []).map(v => [v.value.toLowerCase(), v.value]));
    return (images || []).map(img => {
        const plain = typeof img.toObject === 'function' ? img.toObject() : { ...img };
        const color = plain.color ? byLower.get(String(plain.color).toLowerCase()) : undefined;
        if (color) plain.color = color;
        else delete plain.color;
        return plain;
    });
};

/** Parse a JSON form field into an array (new photos, in upload order) or object (existing photo id → colour). */
const parseTags = raw => {
    if (raw == null || raw === '') return null;
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        throw new VariantError('Photo colours could not be read');
    }
};

module.exports = {
    colorOption,
    imagesForColor,
    imagesForVariant,
    cleanImageColors,
    parseTags,
    VariantError,
    TEMPLATES,
    templateForCategory,
    normalizeOptions,
    normalizeVariants,
    summarize,
    buildVariantFields,
    hasVariants,
    findVariant,
    variantPrice,
    variantLabel,
    selectionOf,
};

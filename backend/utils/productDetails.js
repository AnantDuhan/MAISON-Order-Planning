// Highlights and specifications for the product page. They arrive as JSON
// strings in the multipart product form (or as arrays from JSON clients).
// Anything unreadable, empty or over the limits is dropped rather than
// rejected, so a bad row never blocks saving the rest of the product.

const MAX_HIGHLIGHTS = 4;
const MAX_SPECS = 30;

const parse = raw => {
    if (raw === undefined) return undefined;
    if (Array.isArray(raw)) return raw;
    try {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
};

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** { highlights?, specs? } — a key is present only if the body sent it. */
const parseProductDetails = body => {
    const out = {};
    const highlights = parse(body.highlights);
    if (highlights) {
        out.highlights = highlights.map(h => clean(h, 60)).filter(Boolean).slice(0, MAX_HIGHLIGHTS);
    }
    const specs = parse(body.specs);
    if (specs) {
        out.specs = specs
            .map(row => ({ label: clean(row?.label, 40), value: clean(row?.value, 160) }))
            .filter(row => row.label && row.value)
            .slice(0, MAX_SPECS);
    }
    return out;
};

module.exports = { parseProductDetails, MAX_HIGHLIGHTS, MAX_SPECS };

const Category = require('../models/category');
const Product = require('../models/product');
const cache = require('../utils/cache');
const generateId = require('../utils/generateId');

// Categories are read on every home and shop page, so the public tree is
// cached briefly; any admin change clears it.
const TREE_KEY = 'categories:tree';
const TREE_TTL = 300;

const slugify = name =>
    String(name || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

// The store's starting departments, and where older product categories fit.
const DEFAULT_DEPARTMENTS = [
    { name: 'Electronics', description: 'Phones, audio and the tech you reach for every day.' },
    { name: 'Clothes', description: 'Everyday pieces, cut to last.' },
    { name: 'Shoes', description: 'Shoes worth wearing in.' },
    { name: 'Accessories', description: 'The small things you carry daily.' },
    { name: 'Home & Living', description: 'Objects for the rooms you live in.' },
];
const LEGACY_PARENT = [
    { match: /phone|mobile|laptop|computer|camera|audio|bud|headphone|earphone|speaker|watch|tablet|electronic/i, parent: 'Electronics' },
    { match: /top|shirt|tee|bottom|jean|trouser|pant|track|attire|dress|jacket|hoodie|kurta|cloth|apparel/i, parent: 'Clothes' },
    { match: /foot|shoe|sneaker|boot|sandal/i, parent: 'Shoes' },
    { match: /bag|wallet|belt|cap|hat|sunglass|accessor|jewel/i, parent: 'Accessories' },
    { match: /home|decor|kitchen|lamp|living/i, parent: 'Home & Living' },
];

/**
 * First run only: create the default departments, then file every category
 * already used by products under the department it best fits (or at the top
 * level when nothing matches). Product data is never changed.
 */
async function seedIfEmpty() {
    if (await Category.estimatedDocumentCount()) return false;

    const docs = [];
    const bySlug = new Map();
    DEFAULT_DEPARTMENTS.forEach((d, i) => {
        const doc = { _id: generateId(), name: d.name, slug: slugify(d.name), description: d.description, parent: null, sortOrder: i, isActive: true };
        docs.push(doc);
        bySlug.set(doc.slug, doc);
    });

    const used = (await Product.distinct('category')).filter(Boolean);
    used.forEach((name, i) => {
        const slug = slugify(name);
        if (!slug || bySlug.has(slug)) return;
        const parentName = LEGACY_PARENT.find(rule => rule.match.test(name))?.parent;
        const parent = parentName ? bySlug.get(slugify(parentName)) : null;
        const doc = { _id: generateId(), name: String(name).trim().slice(0, 40), slug, description: '', parent: parent ? parent._id : null, sortOrder: 100 + i, isActive: true };
        docs.push(doc);
        bySlug.set(slug, doc);
    });

    try {
        await Category.insertMany(docs, { ordered: false });
    } catch (error) {
        // Another instance seeded at the same moment: the unique slug index keeps one copy.
        if (error.code !== 11000 && !error.writeErrors) throw error;
    }
    return true;
}

const byOrder = (a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name);

/**
 * Departments with their categories, product counts and a display image.
 * `includeInactive` is for the admin screen.
 */
async function getTree({ includeInactive = false } = {}) {
    if (!includeInactive) {
        const cached = await cache.getJSON(TREE_KEY);
        if (cached) return cached;
    }
    await seedIfEmpty();

    const all = await Category.find(includeInactive ? {} : { isActive: true }).lean();
    // Product counts and newest photo per category name (case-insensitive).
    const stats = await Product.aggregate([
        { $match: { isDemo: { $ne: true } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 }, image: { $first: { $arrayElemAt: ['$images.url', 0] } } } },
    ]);
    const statOf = name => stats.find(s => s._id === String(name).toLowerCase()) || { count: 0, image: null };

    const shape = c => {
        const s = statOf(c.name);
        return {
            _id: c._id, name: c.name, slug: c.slug, description: c.description || '', parent: c.parent || null,
            sortOrder: c.sortOrder, isActive: c.isActive, image: c.image?.url || null,
            ownCount: s.count, ownImage: s.image,
        };
    };
    const items = all.map(shape);
    const ids = new Set(items.map(i => i._id));
    // A category whose parent is missing or hidden shows at the top level.
    const departments = items.filter(i => !i.parent || !ids.has(i.parent)).sort(byOrder);
    const tree = departments.map(d => {
        const children = items.filter(i => i.parent === d._id).sort(byOrder).map(c => ({
            ...c, productCount: c.ownCount, displayImage: c.image || c.ownImage || null,
        }));
        const productCount = d.ownCount + children.reduce((n, c) => n + c.ownCount, 0);
        const displayImage = d.image || d.ownImage || children.find(c => c.displayImage)?.displayImage || null;
        return { ...d, productCount, displayImage, children };
    });

    if (!includeInactive) await cache.setJSON(TREE_KEY, tree, TREE_TTL);
    return tree;
}

/** Category names a filter value covers: itself plus, for a department, its categories. */
async function namesFor(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];
    const tree = await getTree();
    const lower = raw.toLowerCase();
    for (const d of tree) {
        if (d.slug === lower || d.name.toLowerCase() === lower) return [d.name, ...d.children.map(c => c.name)];
        const child = d.children.find(c => c.slug === lower || c.name.toLowerCase() === lower);
        if (child) return [child.name];
    }
    return [raw];
}

/** Every category name a product can be filed under (for forms and the AI draft). */
async function assignableNames() {
    const tree = await getTree();
    return tree.flatMap(d => [d.name, ...d.children.map(c => c.name)]);
}

const clearCache = () => cache.del(TREE_KEY);

module.exports = { slugify, seedIfEmpty, getTree, namesFor, assignableNames, clearCache, DEFAULT_DEPARTMENTS };

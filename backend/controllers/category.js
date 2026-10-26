const Category = require('../models/category');
const Product = require('../models/product');
const generateId = require('../utils/generateId');
const categories = require('../services/categoryService');

const escapeRegex = v => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactName = name => new RegExp(`^${escapeRegex(name)}$`, 'i');

class InputError extends Error {}

// Validate and tidy the admin form. `existing` is the category being edited.
async function readInput(body, existing) {
    const out = {};
    if (body.name !== undefined || !existing) {
        const name = String(body.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
        if (!name) throw new InputError('Give the category a name');
        out.name = name;
        out.slug = categories.slugify(name);
        if (!out.slug) throw new InputError('Use letters or numbers in the name');
        const clash = await Category.findOne({ slug: out.slug, ...(existing && { _id: { $ne: existing._id } }) }).lean();
        if (clash) throw new InputError(`"${clash.name}" already exists`);
    }
    if (body.description !== undefined) out.description = String(body.description || '').trim().slice(0, 160);
    if (body.sortOrder !== undefined) {
        const n = Number(body.sortOrder);
        out.sortOrder = Number.isFinite(n) ? Math.round(n) : 0;
    }
    if (body.isActive !== undefined) out.isActive = body.isActive === true || body.isActive === 'true';
    if (body.parent !== undefined) {
        const parentId = body.parent ? String(body.parent) : null;
        if (parentId) {
            if (existing && parentId === existing._id) throw new InputError('A category can’t sit inside itself');
            const parent = await Category.findById(parentId).lean();
            if (!parent) throw new InputError('That department no longer exists');
            if (parent.parent) throw new InputError('Categories go one level deep: choose a department');
            if (existing && (await Category.exists({ parent: existing._id }))) {
                throw new InputError('This department has categories inside it, so it can’t move into another');
            }
        }
        out.parent = parentId;
    }
    return out;
}

// Product listings are cached per filter for a minute, so they catch up on their own.
const done = () => categories.clearCache();

// GET /categories — public: active departments and categories with counts.
exports.listCategories = async (req, res) => {
    try {
        res.status(200).json({ success: true, categories: await categories.getTree() });
    } catch (error) {
        console.error('List categories error:', error);
        res.status(500).json({ success: false, message: 'Could not load categories' });
    }
};

// GET /admin/categories — everything, hidden ones too.
exports.adminListCategories = async (req, res) => {
    try {
        res.status(200).json({ success: true, categories: await categories.getTree({ includeInactive: true }) });
    } catch (error) {
        console.error('Admin list categories error:', error);
        res.status(500).json({ success: false, message: 'Could not load categories' });
    }
};

// POST /admin/categories
exports.createCategory = async (req, res) => {
    try {
        const fields = await readInput(req.body || {}, null);
        const category = await Category.create({ _id: generateId(), parent: null, ...fields });
        res.locals.audit = { after: { name: category.name, parent: category.parent }, summary: `Category "${category.name}" created` };
        await done();
        res.status(201).json({ success: true, category });
    } catch (error) {
        if (error instanceof InputError) return res.status(400).json({ success: false, message: error.message });
        console.error('Create category error:', error);
        res.status(500).json({ success: false, message: 'Could not create the category' });
    }
};

// PUT /admin/categories/:id — renaming also renames it on its products.
exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

        const before = { name: category.name, parent: category.parent, isActive: category.isActive };
        const fields = await readInput(req.body || {}, category);
        const renamed = fields.name && fields.name !== category.name;
        const oldName = category.name;
        Object.assign(category, fields);
        await category.save();

        let productsUpdated = 0;
        if (renamed) {
            const result = await Product.updateMany({ category: exactName(oldName) }, { $set: { category: category.name } });
            productsUpdated = result.modifiedCount || 0;
        }

        res.locals.audit = {
            before,
            after: { name: category.name, parent: category.parent, isActive: category.isActive },
            summary: `Category "${oldName}" updated${renamed ? ` (renamed on ${productsUpdated} products)` : ''}`,
        };
        await done();
        res.status(200).json({ success: true, category, productsUpdated });
    } catch (error) {
        if (error instanceof InputError) return res.status(400).json({ success: false, message: error.message });
        console.error('Update category error:', error);
        res.status(500).json({ success: false, message: 'Could not update the category' });
    }
};

// DELETE /admin/categories/:id — only when nothing depends on it.
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

        if (await Category.exists({ parent: category._id })) {
            return res.status(409).json({ success: false, message: 'Move or delete the categories inside it first' });
        }
        const inUse = await Product.countDocuments({ category: exactName(category.name) });
        if (inUse) {
            return res.status(409).json({
                success: false,
                message: `${inUse} ${inUse === 1 ? 'product uses' : 'products use'} this category. Move them, or hide the category instead.`,
            });
        }

        await category.deleteOne();
        res.locals.audit = { before: { name: category.name }, summary: `Category "${category.name}" deleted` };
        await done();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'Could not delete the category' });
    }
};

exports._readInput = readInput; // for tests

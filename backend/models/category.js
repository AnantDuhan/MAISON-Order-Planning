const mongoose = require('mongoose');

/**
 * Store categories, managed from Admin > Categories.
 *
 * Two levels: a department (no parent, e.g. "Electronics") and categories
 * inside it (e.g. "Smartphones"). A product's `category` holds the NAME of
 * either level, so existing products keep working as categories are added.
 */
const categorySchema = new mongoose.Schema(
    {
        _id: String,
        name: { type: String, required: true, trim: true, maxlength: 40 },
        slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
        description: { type: String, trim: true, maxlength: 160, default: '' },
        parent: { type: String, ref: 'Category', default: null },
        image: {
            url: { type: String, default: null },
        },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);

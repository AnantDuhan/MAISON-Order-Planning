const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const productSchema = mongoose.Schema({
    _id: String,
    name: {
        type: String,
        required: [true, 'Please Enter product Name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please Enter product description']
    },
    price: {
        type: Number,
        required: [true, 'Please Enter product price'],
        maxLength: [6, "Price can't exceed 8 figures"]
    },
    ratings: {
        type: Number,
        default: 0
    },
    images: [
        {
            _id: String,
            url: {
                type: String,
                required: true
            },
            // Value of the product's colour option this photo shows (e.g.
            // "Navy"). Empty = shared by every colour (fabric close-up, size
            // chart). See imagesForSelection in utils/productVariants.js.
            color: String
        }
    ],
    user: {
        type: String,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: [true, 'Please Enter product category']
    },
    // Units available to sell right now. Checkout holds and placed orders are
    // already subtracted (see services/inventoryService.js).
    Stock: {
        type: Number,
        required: [true, 'Please Enter product stock']
    },
    // Alert admins when Stock falls to or below this. null = use the default
    // (LOW_STOCK_THRESHOLD env, else 5).
    lowStockThreshold: {
        type: Number,
        default: null,
        min: 0
    },
    // Set when a low-stock alert has gone out; cleared when restocked above the
    // threshold, so each dip alerts once.
    lowStockAlertedAt: {
        type: Date,
        default: null
    },
    // Options like Size and Colour, and one variant per combination with its
    // own stock, optional price and SKU (utils/productVariants.js). Empty for
    // products without options, which work exactly as before.
    options: {
        type: [
            {
                _id: false,
                name: { type: String, required: true },
                kind: { type: String, enum: ['size', 'color', 'text'], default: 'text' },
                values: [{ _id: false, value: { type: String, required: true }, hex: String }],
            },
        ],
        default: [],
    },
    variants: {
        type: [
            {
                _id: String,
                options: { type: Map, of: String },
                price: { type: Number, default: null, min: 0 },
                Stock: { type: Number, default: 0, min: 0 },
                sku: String,
                active: { type: Boolean, default: true },
            },
        ],
        default: [],
    },
    // Lowest and highest variant price, for "From ₹…" in listings.
    priceFrom: { type: Number, default: null },
    priceTo: { type: Number, default: null },
    numOfReviews: {
        type: Number,
        default: 0
    },
    reviews: [
        {
            _id: String,
            user: {
                type: String,
                ref: 'User',
                required: true
            },
            name: {
                type: String,
                required: true
            },
            rating: {
                type: Number,
                required: true
            },
            comment: {
                type: String,
                required: true
            }
        }
    ],
    aiSummary: {
        overall: {
            type: String,
            default: '',
        },
        pros: {
            type: [String],
            default: [],
        },
        cons: {
            type: [String],
            default: [],
        },
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    embedding: {
        type: [Number],
        select: false
    },
    isDemo: {
        type: Boolean,
        default: false,
        index: true
    },
});

// Indexes for listing/filter/sort/search hot paths. The text index backs
// keyword search; the Gemini vector index is configured in Atlas separately.
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ ratings: -1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);

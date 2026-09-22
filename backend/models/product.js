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
            }
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
    Stock: {
        type: Number,
        required: [true, 'Please Enter product stock']
    },
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

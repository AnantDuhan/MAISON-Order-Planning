const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    _id: String,
    title: {
        type: String,
        required: [true, 'Please enter a title'],
        maxLength: [40, 'Title cannot exceed 40 characters']
    },
    subtitle: {
        type: String,
        required: [true, 'Please enter a subtitle'],
        maxLength: [60, 'Subtitle cannot exceed 60 characters']
    },
    description: {
        type: String,
        required: [true, 'Please enter a description'],
        maxLength: [140, 'Description cannot exceed 140 characters']
    },
    buttonText: {
        type: String,
        default: 'Shop Now'
    },
    image: {
        url: {
            type: String,
            default: null
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Banner', bannerSchema);

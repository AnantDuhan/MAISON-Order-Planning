const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const productSchema = mongoose.Schema({
   name: {
      type: String,
      required: [true, 'Please Enter product Name'],
      trim: true,
   },
   description: {
      type: String,
      required: [true, 'Please Enter product description'],
   },
   price: {
      type: Number,
      required: [true, 'Please Enter product price'],
      maxLength: [6, "Price can't exceed 8 figures"],
   },
   ratings: {
      type: Number,
      default: 0,
   },
   images: [
      {
         url: {
            type: String,
            required: true,
         }
      },
   ],
   user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
   },
   category: {
      type: String,
      required: [true, 'Please Enter product category'],
   },
   Stock: {
      type: Number,
      required: [true, 'Please Enter product stock'],
   },
   numOfReviews: {
      type: Number,
      default: 0,
   },
   reviews: [
      {
         user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
         },
         name: {
            type: String,
            required: true,
         },
         rating: {
            type: Number,
            required: true,
         },
         comment: {
            type: String,
            required: true,
         },
      },
   ],
   createdAt: {
      type: Date,
      default: Date.now,
   },
});

module.exports = mongoose.model("Product", productSchema);

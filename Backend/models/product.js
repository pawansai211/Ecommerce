const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true
    },
    richDescription: { // used if you need more description
        type: String,
        default: ''
    },
    image: {
        type: String,
        default: ''
    },
    images: [{ // used if you need more images for product
        type: String
    }],
    brand: {
        type: String,
        default: ''
    },
    price : {
        type: Number,
        default:0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required:true
    },
    countInStock: {
        type: Number,
        required: true,
        min: 0,
        max: 255
    },
    rating: {
        type: Number,
        default: 0,
    },
    numReviews: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    dateCreated: {
        type: Date,
        default: Date.now,
    },
    embedding: { 
        type: [Number], 
        default: Array(1536).fill(0),
        index: 'vector' // This enables MongoDB Atlas Vector Search
    }, // Stores OpenAI-generated embedding vector
    // recommendations: [{ 
    //     type: mongoose.Schema.Types.ObjectId, ref: 'Product' 
    // }] // Stores recommended product IDs
})
productSchema.index({ embedding: '2dsphere' }); // Ensure indexing for vector search

productSchema.virtual('id').get(function () {
    return this._id.toHexString(); // convert object id to string
});

productSchema.set('toJSON', {
    virtuals: true, // enable virtuals for frontend
});


exports.Product = mongoose.model('Product', productSchema);

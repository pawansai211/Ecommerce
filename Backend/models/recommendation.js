const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recommendedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    createdAt: { type: Date, default: Date.now }
});

const Recommendation = mongoose.model('Recommendation', RecommendationSchema);
module.exports = { Recommendation };

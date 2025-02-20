const express = require('express');
const { Product } = require('../models/product');
const { Order } = require('../models/order');
const router = express.Router();

// Function to compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

// API Endpoint: Fetch personalized recommendations
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id; 
        const userOrders = await Order.find({ user: userId });

        if (userOrders.length === 0) {
            // If no orders, return featured products
            const featuredProducts = await Product.find({ isFeatured: true }).limit(10);
            return res.json({ recommendations: featuredProducts, message: "No order history found, showing featured products." });
        }

        // Extract product IDs from past orders
        const orderedProductIds = userOrders.flatMap(order => order.orderItems.map(item => item.product));
        const orderedProducts = await Product.find({ _id: { $in: orderedProductIds } });

        // Fetch all available products excluding ordered ones
        const allProducts = await Product.find({ _id: { $nin: orderedProductIds } });

        let recommendations = [];

        for (let orderedProduct of orderedProducts) {
            if (!orderedProduct.embedding || orderedProduct.embedding.length === 0) continue;

            for (let otherProduct of allProducts) {
                if (!otherProduct.embedding || otherProduct.embedding.length === 0) continue;

                const similarity = cosineSimilarity(orderedProduct.embedding, otherProduct.embedding);
                recommendations.push({ product: otherProduct, similarity });
            }
        }

        // Sort by similarity and return top 10 recommendations
        recommendations.sort((a, b) => b.similarity - a.similarity);
        res.json({ recommendations: recommendations.slice(0, 10) });

    } catch (error) {
        console.error("Recommendation Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;

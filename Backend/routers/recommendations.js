const express = require('express');
const { Product } = require('../models/product');
const { Order } = require('../models/order');
const { Recommendation } = require('../models/recommendation');
const OpenAI = require('openai');
const mongoose = require('mongoose');
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * GET /recommendations/:customerId
 * Fetch stored recommendations for a customer
 */
router.get('/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        // Retrieve recommendations without requiring authentication
        const recommendation = await Recommendation.findOne({ user: customerId }).populate('recommendedProducts');

        if (!recommendation || !recommendation.recommendedProducts.length) {
            return res.status(404).json({ error: "No recommendations found for this customer." });
        }

        res.json({
            message: "Recommendations retrieved successfully.",
            recommendations: recommendation.recommendedProducts.map(p => ({
                id: p._id,
                name: p.name,
                description: p.description,
                price: p.price,
                image: p.image
            }))
        });

    } catch (error) {
        console.error("Error retrieving recommendations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


/**
 * POST /chatbot
 * Admin chatbot for generating and saving personalized recommendations
 */
router.post('/chatbot', async (req, res) => {
    try {

        // Ensure admin authentication
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: "Access denied. Admins only." });
        }

        const { query: userQuery, customerId } = req.body;
        if (!userQuery || !customerId) {
            return res.status(400).json({ error: "Both query and customerId are required." });
        }

        console.log(`Admin ID: ${req.user.id} is requesting recommendations for Customer ID: ${customerId}`);

        // Retrieve all previous orders for the specified customer and populate orderItems -> product
        const previousOrders = await Order.find({ user: customerId }).populate({
            path: 'orderItems',
            populate: { path: 'product', select: 'name embedding' } // Ensure product details are loaded
        });

        if (!previousOrders.length) {
            return res.status(404).json({ error: "No purchase history found for this customer." });
        }

        // Extract product IDs correctly from populated orderItems
        const purchasedProducts = previousOrders.flatMap(order => 
            order.orderItems.map(item => item.product?._id) // Ensure we're getting the product ID
        ).filter(Boolean); // Remove any null or undefined values

        if (!purchasedProducts.length) {
            return res.status(404).json({ error: "No purchased products found for this customer." });
        }

        // Retrieve embeddings of all previously purchased products
        const pastEmbeddings = await Product.find(
            { _id: { $in: purchasedProducts } }, 
            { name: 1, embedding: 1 } // Fetch product name and embedding only
        );

        if (!pastEmbeddings.length) {
            return res.status(500).json({ error: "No embeddings found for purchased products." });
        }

        console.log(`Found ${pastEmbeddings.length} embeddings from past purchases.`);

        // Calculate the average embedding safely
        const embeddingLength = pastEmbeddings[0]?.embedding?.length || 0;
        if (!embeddingLength) {
            return res.status(500).json({ error: "Invalid embeddings found." });
        }

        const averageEmbedding = pastEmbeddings.reduce((acc, curr) => {
            return acc.map((val, i) => val + (curr.embedding?.[i] ?? 0));
        }, new Array(embeddingLength).fill(0)).map(val => val / pastEmbeddings.length);

        // Perform vector search for recommendations
        const recommendations = await Product.aggregate([
            {
                $vectorSearch: {
                    index: "emmbeddings",
                    path: "embedding",
                    queryVector: averageEmbedding,
                    numCandidates: 100,
                    limit: 10
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    description: 1,
                    price: 1,
                    image: 1
                }
            }
        ]);

        if (!recommendations.length) {
            return res.status(404).json({ error: "No relevant recommendations found." });
        }

        // Save recommendations to the database
        await Recommendation.findOneAndUpdate(
            { user: customerId },
            { user: customerId, recommendedProducts: recommendations.map(p => p._id) },
            { upsert: true, new: true }
        );

        // Format recommendations for ChatGPT
        const productDescriptions = recommendations.map((p, index) =>
            `${index + 1}. ${p.name} - ${p.description} (Price: $${p.price})`
        ).join('\n');

        // Strict ChatGPT prompt ensuring only database recommendations are used
        const chatPrompt = `You are an AI assistant for an e-commerce admin.
        The admin asked: "${userQuery}" regarding a customer's past purchases.

        Based on the customer's purchase history, here are the recommended products:

        ${productDescriptions}

        These products have been selected using a vector-based similarity search, 
        ensuring relevance to the customer's past interests.

        Please respond by listing these recommendations in a natural language format, 
        as if you were making a personalized suggestion. Ensure you include the product name, description, and price for each recommendation. DO NOT invent new recommendations beyond this list.`;

        // Get ChatGPT response
        const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are an AI assistant for an e-commerce admin. Only recommend products from the given list.' },
                { role: 'user', content: chatPrompt }
            ]
        });

        const chatReply = chatResponse.choices[0].message.content;

        // Return structured response
        res.json({
            message: chatReply,
            recommendations: recommendations.map((p) => ({
                id: p._id,
                name: p.name,
                description: p.description,
                price: p.price,
                image: p.image
            }))
        });

    } catch (error) {
        console.error("Chatbot Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


module.exports = router;

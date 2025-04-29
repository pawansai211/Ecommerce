const express = require('express');
const { Product } = require('../models/product');
const { Order } = require('../models/order');
const { Recommendation } = require('../models/recommendation');

const { Category } = require('../models/category');
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
      if (!req.user?.isAdmin) {
        return res.status(403).json({ error: "Access denied. Admins only." });
      }
  
      const { query: userQuery, customerId } = req.body;
      if (!userQuery || !customerId) {
        return res.status(400).json({ error: "Both query and customerId are required." });
      }
  
      console.log(`Admin ID: ${req.user.id} is requesting recommendations for Customer ID: ${customerId}`);
  
      const previousOrders = await Order.find({ user: customerId }).populate({
        path: 'orderItems',
        populate: { path: 'product', select: 'name embedding' }
      });
  
      if (!previousOrders.length) {
        return res.status(404).json({ error: "No purchase history found for this customer." });
      }
  
      const purchasedProducts = previousOrders.flatMap(order =>
        order.orderItems.map(item => item.product?._id)
      ).filter(Boolean);
  
      const pastEmbeddings = await Product.find(
        { _id: { $in: purchasedProducts } },
        { name: 1, embedding: 1 }
      );
  
      if (!pastEmbeddings.length) {
        return res.status(500).json({ error: "No embeddings found for purchased products." });
      }
  
      const embeddingLength = pastEmbeddings[0]?.embedding?.length || 0;
      if (!embeddingLength) {
        return res.status(500).json({ error: "Invalid embeddings found." });
      }
  
      const averageEmbedding = pastEmbeddings.reduce((acc, curr) => {
        return acc.map((val, i) => val + (curr.embedding?.[i] ?? 0));
      }, new Array(embeddingLength).fill(0)).map(val => val / pastEmbeddings.length);
      

      // 🔍 Step 1: Extract filter/category from admin prompt using OpenAI
      const filterExtractionPrompt = `
  Extract a specific product category or filter from the prompt below. 
  Respond with only one word or short phrase (like "women trousers", "laptops", "shoes").
  If no specific category or type is mentioned, respond with "none".
  
  Prompt: "${userQuery}"
  Category:
      `;
  
      const extractionResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You extract a single product category or filter term from admin queries. Respond only with the category or "none".'
          },
          { role: 'user', content: filterExtractionPrompt }
        ]
      });
  
      const extractedCategory = extractionResponse.choices[0].message.content.trim().toLowerCase();
      console.log("Extracted Filter:", extractedCategory);

      
      
  
      // 🔍 Step 2: Build vector search with optional category filter
      const vectorSearchStage = {
        $vectorSearch: {
          index: "emmbeddings",
          path: "embedding",
          queryVector: averageEmbedding,
          numCandidates: 100,
          limit: 10
        }
      };
  
      let useCategory = false;
  
      if (extractedCategory !== 'none') {
        try {
          const matchedCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${extractedCategory}$`, 'i') }
          });
  
          if (matchedCategory) {
            vectorSearchStage.$vectorSearch.filter = {
              category: matchedCategory._id
            };
            useCategory = true;
            console.log("Matched category ObjectId:", matchedCategory._id);

            console.log("Category filter applied:", matchedCategory.name);
          } else {
            console.log("Category not found in DB. Proceeding without category filter.");
          }
        } catch (err) {
          console.error("Error while fetching category:", err);
          // Proceed without category filter
        }
      }
  
      const recommendations = await Product.aggregate([
        vectorSearchStage,
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
  
      // 💾 Save to DB
      await Recommendation.findOneAndUpdate(
        { user: customerId },
        { user: customerId, recommendedProducts: recommendations.map(p => p._id) },
        { upsert: true, new: true }
      );
  
      // 🧠 Compose ChatGPT Response
      const productDescriptions = recommendations.map((p, index) =>
        `${index + 1}. ${p.name} - ${p.description} (Price: $${p.price})`
      ).join('\n');
  
      const chatPrompt = `You are an AI assistant for an e-commerce admin.
  The admin asked: "${userQuery}"
  
  Based on the customer's purchase history, here are the most relevant recommendations:
  
  ${productDescriptions}
  
  Only use these recommendations. DO NOT generate new suggestions. Write in a friendly, helpful tone.`;
  
      const chatResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI assistant for an e-commerce admin. Only recommend products from the provided list.' },
          { role: 'user', content: chatPrompt }
        ]
      });
  
      const chatReply = chatResponse.choices[0].message.content;
  
      res.json({
        message: chatReply,
        recommendations: recommendations.map(p => ({
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

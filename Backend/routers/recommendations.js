const express = require('express');
const { Product } = require('../models/product');
const OpenAI = require('openai');
const { Order } = require('../models/order');
const router = express.Router();
const session = require('express-session');


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// API Endpoint: Fetch personalized recommendations, this endpoint doesn't use chatbot only user history
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id; 

        // Fetch user's past orders
        const userOrders = await Order.find({ user: userId });
        if (userOrders.length === 0) {
            // If no orders, return featured products
            const featuredProducts = await Product.find({ isFeatured: true }).limit(10);
            return res.json({ recommendations: featuredProducts, message: "No order history found, showing featured products." });
        }

        // Get product IDs from past orders
        const orderedProductIds = userOrders.flatMap(order => order.orderItems.map(item => item.product));

        // Fetch the most recent ordered product
        const lastOrderedProduct = await Product.findById(orderedProductIds[0]);

        if (!lastOrderedProduct || !lastOrderedProduct.embedding.length) {
            return res.status(500).json({ error: "No embeddings found for the last ordered product." });
        }

        // Use MongoDB Vector Search to find similar products
        const recommendations = await Product.aggregate([
            {
                $vectorSearch: {
                    index: "emmbeddings", 
                    path: "embedding",
                    queryVector: lastOrderedProduct.embedding,
                    numCandidates: 100,
                    limit: 10 // Get top 10 similar products
                }
            }
        ]);

        res.json({ recommendations });

    } catch (error) {
        console.error("Recommendation Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// used to store chats for followup questions
router.use(session({
    secret: 'recommendation_secret', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use `true` in production with HTTPS
}));

router.post('/chatbot', async (req, res) => {
    try {        

        const userQuery = req.body.query;
        if (!userQuery) {
            return res.status(400).json({ error: 'Query is required' });
        }

        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found in request." });
        }

        const userId = req.user.id; // Ensure req.user exists before accessing id
        console.log(`Authenticated User ID: ${userId}`);


        // Retrieve conversation history (if any)
        const conversationHistory = req.session.conversation || { lastQuery: null, lastEmbedding: null };

        // Generate embedding for the user query
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: userQuery
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;

        if (!queryEmbedding) {
            return res.status(500).json({ error: 'Failed to generate query embedding' });
        }

        let recommendations = [];

        // If this is a follow-up query, perform a new vector search using the latest query embedding
        console.log(conversationHistory.lastQuery ? `Follow-up query detected: "${userQuery}"` : "New query detected.");
        
        // here we get recommendations based on user query embeddings and product embeddings from the db
        recommendations = await Product.aggregate([
            {
                $vectorSearch: {
                    index: "emmbeddings",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: 5
                }
            }
        ]);

        // Store the latest embedding and query for the next follow-up
        req.session.conversation = {
            lastQuery: userQuery,
            lastEmbedding: queryEmbedding
        };

        // Format recommendations for ChatGPT
        const productDescriptions = recommendations.map((p, index) => 
            `${index + 1}. ${p.name} - ${p.description}`
        ).join('\n');

        // Generate a more natural chat prompt based on previous interactions
        let chatPrompt;
        if (conversationHistory.lastQuery) {
            chatPrompt = `The user previously asked: "${conversationHistory.lastQuery}" and I recommended some products.
            Now, they are asking: "${userQuery}". Based on their previous query and the new one, here are the best product recommendations:
            ${productDescriptions}
            
            Respond in a friendly way, considering the previous context.`;
        } else {
            chatPrompt = `A user asked: "${userQuery}". Based on their query, I recommend:
            ${productDescriptions}
            
            Provide a friendly response suggesting these products.`;
        }

        // Get ChatGPT response
        const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a helpful product recommendation assistant. Personalize responses based on past orders and follow-up queries.' },
                { role: 'user', content: chatPrompt }
            ]
        });

        const chatReply = chatResponse.choices[0].message.content;

        res.json({ response: chatReply, recommendations });

    } catch (error) {
        console.error('Chatbot Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

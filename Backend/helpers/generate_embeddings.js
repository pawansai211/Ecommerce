// This script generates embeddings for products that don't have them yet.
// It uses the OpenAI API to generate embeddings for product names and descriptions.
// The embeddings are stored in the 'embedding' field of the Product model.
// To run this script, use the following command: node generate_embeddings.js
// Make sure to set the OPENAI_API_KEY environment variable in your .env file.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log("Current Directory:", __dirname);
console.log("Loaded OpenAI API Key:", process.env.OPENAI_API_KEY);

const mongoose = require('mongoose');
const OpenAI = require('openai');
const { Product } = require('../models/product');


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbeddingsForProducts() {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true });

        console.log('Connected to MongoDB');

        const FORCE_REGEN = true;
        const products = await Product.find(FORCE_REGEN ? {} : { "embedding.0": 0 }).limit(50);


        if (products.length === 0) {
            console.log('No products without embeddings found.');
            return;
        }

        console.log(`Processing ${products.length} products...`);

        for (let product of products) {
            try {
                const text = `Name: ${product.name}, Description: ${product.description}, Category: ${product.category}, Brand: ${product.brand}`;

                const response = await openai.embeddings.create({ model: 'text-embedding-ada-002', input: text });
                const embedding = response.data[0].embedding;

                await Product.findByIdAndUpdate(product._id, { embedding });

                console.log(`Updated embedding for product: ${product.name}`);
            } catch (error) {
                console.error(`Error processing product ${product.name}:`, error.message);
            }
        }

        console.log('Embedding generation complete.');
    } catch (error) {
        console.error('Error connecting to database:', error);
    } finally {
        mongoose.disconnect();
    }
}

generateEmbeddingsForProducts();

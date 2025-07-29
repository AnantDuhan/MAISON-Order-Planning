import { Client } from '@elastic/elasticsearch';
import Product from '../models/product.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Correctly point to your main config file
dotenv.config({ path: 'backend/config/config.env' });

const client = new Client({ node: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200' });
const indexName = 'products';

const syncProducts = async () => {
    try {
        mongoose
                .connect(process.env.DB_HOSTED_URI)
                .then(data => {
                    console.log(
                        `🚀🚀 MongoDB connected with server: ${data.connection.host}`
                    );
                });
        console.log('Database connected for sync.');

        const indexExists = await client.indices.exists({ index: indexName });
        if (indexExists) {
            await client.indices.delete({ index: indexName });
            console.log(`Index '${indexName}' deleted.`);
        }

        await client.indices.create({
            index: indexName,
            body: {
                mappings: {
                    properties: {
                        name: { type: 'search_as_you_type' }, // Optimized for autocomplete
                        description: { type: 'text' },
                        category: { type: 'keyword' },
                        ratings: { type: 'float' },
                        price: { type: 'float' },
                    },
                },
            },
        });
        console.log(`Index '${indexName}' created.`);

        const products = await Product.find();
        console.log(`Found ${products.length} products to index.`);

        if (products.length === 0) {
            console.log('No products to index.');
            process.exit(0);
        }

        const operations = products.flatMap(doc => [
            { index: { _index: indexName, _id: doc._id.toString() } },
            {
                name: doc.name,
                description: doc.description,
                category: doc.category,
                ratings: doc.ratings,
                price: doc.price,
            }
        ]);

        const bulkResponse = await client.bulk({ refresh: true, body: operations });

        // --- THIS IS THE FIX ---
        // More robust error handling for the bulk response
        if (bulkResponse.errors) {
            const erroredDocuments = [];
            bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0];
                if (action[operation].error) {
                    erroredDocuments.push({
                        status: action[operation].status,
                        error: action[operation].error,
                        operation: operations[i * 2],
                        document: operations[i * 2 + 1]
                    });
                }
            });
            console.error('Failed to index some documents:', JSON.stringify(erroredDocuments, null, 2));
        } else {
            console.log(`Successfully indexed ${products.length} products!`);
        }

    } catch (error) {
        console.error('Error during product sync:', error);
    } finally {
        // Mongoose connection might keep the script alive, so we exit explicitly
        process.exit(0);
    }
};

syncProducts();
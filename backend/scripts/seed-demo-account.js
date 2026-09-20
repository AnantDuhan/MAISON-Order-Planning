const mongoose = require('mongoose');
require('dotenv').config({ path: '../config/config.env' });
const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const generateId = require('../utils/generateId');

const cloneImages = (images = []) =>
    images.map(image => {
        const imageData = image.toObject
            ? image.toObject()
            : { ...image };

        return {
            ...imageData,
            _id: new mongoose.Types.ObjectId()
        };
    });

const seedDemoAccount = async () => {
    try {
        const uri = process.env.DB_HOSTED_URI;
        if (!uri) {
            console.error('No DB_HOSTED_URI found in env. Aborting.');
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log('✓ Connected to MongoDB');

        // Step 1: Check if demo account already exists
        let demoUser = await User.findOne({ email: 'demo@maisonorderplanning.in' });
        
        if (demoUser) {
            console.log('✓ Demo account already exists:', demoUser._id);
        } else {
            // Step 2: Create demo account
            demoUser = await User.create({
                _id: generateId(),
                name: 'Demo Admin',
                email: 'demo@maisonorderplanning.in',
                password: process.env.DEMO_PASSWORD,
                whatsappNumber: 9999999999,
                avatar: 'https://res.cloudinary.com/dx6vf0z1v/image/upload/v1704103055/default_avatar_dzycpq.png',
                isEmailVerified: true,
                isDemo: true,
                role: 'admin',
                addresses: [
                    {
                        _id: generateId(),
                        label: 'Home',
                        address: '123 Innovation Street, Whitefield',
                        city: 'Bangalore',
                        state: 'Karnataka',
                        country: 'India',
                        pinCode: 560066,
                        phoneNumber: 9999999999
                    },
                    {
                        _id: generateId(),
                        label: 'Office',
                        address: '456 Tech Plaza, Indiranagar',
                        city: 'Bangalore',
                        state: 'Karnataka',
                        country: 'India',
                        pinCode: 560038,
                        phoneNumber: 8888888888
                    }
                ]
            });

            console.log('✓ Demo account created:', demoUser.email);
        }

        // Step 3: Add sample products to wishlist
        if (!demoUser.wishlist || demoUser.wishlist.length < 3) {
            const products = await Product.find().limit(10);
            
            if (products.length > 0) {
                const wishlistItems = products
                    .slice(0, Math.min(5, products.length))
                    .map(product => ({
                        _id: product._id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        ratings: product.ratings || 0,
                        images: cloneImages(product.images),
                        product: product._id
                    }));

                demoUser.wishlist = wishlistItems;
                await demoUser.save();
                console.log(`✓ Added ${wishlistItems.length} items to demo wishlist`);
            }
        }

        // Step 4: Create sample orders with different statuses
        const existingOrders = await Order.find({ user: demoUser._id }).select('_id');
        
        if (existingOrders.length === 0) {
            const products = await Product.find().limit(5);
            
            if (products.length > 0) {
                const orderStatuses = [
                    { status: 'Processing', daysAgo: 7 },
                    { status: 'Shipped', daysAgo: 5 },
                    { status: 'Delivered', daysAgo: 2 }
                ];

                for (const orderConfig of orderStatuses) {
                    const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, 2);
                    const orderItems = randomProducts.map(product => ({
                        name: product.name,
                        price: product.price,
                        quantity: Math.floor(Math.random() * 3) + 1,
                        // images: product.images || [],
                        images: cloneImages(product.images),
                        product: product._id
                    }));

                    const itemsPrice = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const taxPrice = Math.round(itemsPrice * 0.05);
                    const shippingPrice = itemsPrice > 500 ? 0 : 50;
                    const totalPrice = itemsPrice + taxPrice + shippingPrice;

                    const createdDate = new Date();
                    createdDate.setDate(createdDate.getDate() - orderConfig.daysAgo);

                    const order = await Order.create({
                        _id: generateId(),
                        user: demoUser._id,
                        shippingInfo: {
                            address: demoUser.addresses[0].address,
                            city: demoUser.addresses[0].city,
                            state: demoUser.addresses[0].state,
                            country: demoUser.addresses[0].country,
                            pinCode: demoUser.addresses[0].pinCode,
                            phoneNumber: demoUser.addresses[0].phoneNumber
                        },
                        orderItems,
                        paymentInfo: {
                            id: `demo_${orderConfig.status.toLowerCase()}_${generateId()}`,
                            status: 'PAID',
                            provider: 'cashfree'
                        },
                        itemsPrice,
                        taxPrice,
                        shippingPrice,
                        totalPrice,
                        orderStatus: orderConfig.status,
                        createdAt: createdDate,
                        paidAt: createdDate,
                        estimatedDeliveryDate: new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                        isDemo: true
                    });

                    console.log(`✓ Created sample order [${orderConfig.status}]: ${order._id}`);
                }
            }
        } else {
            console.log(`✓ Demo already has ${existingOrders.length} sample orders`);
        }

        console.log('\n✅ Demo account seeding completed successfully!');
        console.log(`\nDemo Account Details:`);
        console.log(`Email: demo@maisonorderplanning.in`);
        console.log(`Password: ${process.env.DEMO_PASSWORD || 'Demo@2026'}`);
        console.log(`User ID: ${demoUser._id}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding demo account:', error.message);
        process.exit(1);
    }
};

seedDemoAccount();
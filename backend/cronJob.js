// const Subscribe = require('./models/subscribe');
// const Product = require('./models/product');
// const cron = require('node-cron');
// const sendEmailViaAmazonSES = require('./utils/sendEmail_via_AmazonSES');

// const accountSid = process.env.ACCOUNT_SID;
// const authToken = process.env.AUTH_TOKEN;
// const client = require('twilio')(accountSid, authToken);

// // Define a cron job schedule (e.g., daily at 9 AM)
// const cronJob = cron.schedule('0 10 * * *', async () => {
//     try {
//         // Implement logic to fetch random products and user information from your database
//         const randomProducts = await getRandomProducts();
//         const users = await getUsersToNotify();

//         // Iterate through users and send messages
//         for (const user of users) {
//             // Compose an email message
//             await sendEmailViaAmazonSES({
//                 email: 'anantduhan6@gmail.com',
//                 to: user.email,
//                 subject: `Check out our new range of products!`,
//                 text: `Dear Customer
//                 ,\n\nWe have new range of products for you to explore:\n\n${randomProducts.join()}`
//             });

//             console.log("first", user);

//             console.log('Cron job executed.');
//             console.log(`Email sent to ${user.email}`);

//             // console.log('Random Products:');
//             // console.log(randomProducts);
//         }
//     } catch (error) {
//         console.log(`Error sending email to the user\n: ${error.message}`);
//     }
// });

// const getRandomProducts = async () => {
//     try {
//         const randomProducts = await Product.aggregate([
//             { $sample: { size: 3 } }, // Fetch 3 random products
//             { $project: { name: 1, description: 1, totalPrice: 1, _id: 1 } } // Customize fields to retrieve
//         ]);

//         // Modify randomProducts to include product details in a string
//         const productDetails = randomProducts.map(
//             product =>
//                 `
//                 🌟 New Product Alert! 🌟
//                 name: ${product.name}
//                 description: ${product.description}
//                 amount: ${product.totalPrice}
//                 Explore Now: www.orderplanning.com/product/${product._id}
//             `
//         );

//         return productDetails; // Return the array of product details
//     } catch (error) {
//         console.error('Error fetching random products:', error);
//         return [];
//     }
// };


// const getUsersToNotify = async () => {
//     try {
//         const users = await Subscribe.find(
//             {},
//             { name: 1, email: 1 }
//         );

//         console.log("andr ka user", users);

//         return users || []; // Ensure that it returns an array or an empty array if no users found.
//     } catch (error) {
//         console.error('Error fetching users to notify:', error);
//         return []; // Handle errors by returning an empty array.
//     }
// };


// module.exports = cronJob;

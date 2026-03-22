# MERN Ecommerce Platform

A full-stack e-commerce application built with the MERN stack (MongoDB, Express.js, React.js, Node.js) that provides a comprehensive online shopping experience. This platform offers advanced features for both customers and administrators, including secure payments, inventory management, user reviews, and more.

## 🚀 Features

### 🛒 Customer Features
- **User Authentication & Security**
  - Secure registration and login with JWT tokens
  - Google OAuth integration
  - Two-factor authentication (2FA) support
  - Password reset functionality
  - Role-based access (User/Admin)

- **Product Discovery**
  - Browse products by categories
  - Advanced search and filtering (price, rating, category)
  - Product reviews and ratings
  - AI-powered product summaries
  - Image galleries for products

- **Shopping Experience**
  - Add products to wishlist
  - Shopping cart management
  - Secure checkout with Stripe payment integration
  - Coupon code discounts
  - Order tracking and history

- **Customer Support**
  - Contact form for inquiries
  - Return and refund request system
  - Order status updates via email

- **Personalization**
  - User profiles with avatar upload
  - Wishlist management
  - Order history and reordering
  - Personalized recommendations (AI-powered embeddings)

### 👨‍💼 Admin Features
- **Dashboard Management**
  - Comprehensive admin dashboard
  - User management and analytics
  - Order management and fulfillment
  - Product inventory control

- **Product Management**
  - Create, update, and delete products
  - Category management
  - Stock level monitoring
  - Image upload to AWS S3

- **Order Processing**
  - View and update order status
  - Handle returns and refunds
  - Payment tracking

- **Marketing Tools**
  - Coupon code creation and management
  - Email campaigns and notifications

### 🔧 Technical Features
- **Performance Optimization**
  - Redis caching for 85% performance improvement
  - Image optimization and CDN integration
  - Database query optimization

- **Security**
  - Input validation and sanitization
  - Secure payment processing
  - CORS configuration
  - Rate limiting

- **Communication**
  - Email notifications via Amazon SES
  - Automated order confirmations
  - Password reset emails

- **Testing & Quality**
  - Unit tests with Mocha and Chai
  - Code quality assurance
  - Error handling and logging

### 🌟 Premium Features
- **Plus Membership**
  - Subscription-based premium features
  - Enhanced shopping experience
  - Exclusive discounts

- **Newsletter Subscription**
  - Email marketing integration
  - User engagement tools

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Redis** - Caching layer
- **JWT** - Authentication
- **Stripe** - Payment processing
- **AWS S3** - File storage
- **Amazon SES** - Email service

### Frontend
- **React.js** - UI library
- **Redux** - State management
- **Redux Thunk** - Async actions
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS/Bootstrap** - Styling

### DevOps & Tools
- **Docker** - Containerization
- **Git** - Version control
- **NPM** - Package management
- **VS Code** - Development environment

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis (optional, for caching)
- AWS account (for S3 and SES)
- Stripe account (for payments)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AnantDuhan/MERN-Ecommerce.git
   cd MERN-Ecommerce
   ```

2. **Install dependencies**
   ```bash
   # Root directory
   npm install

   # Backend dependencies
   npm install

   # Frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Environment Setup**
   Create `backend/config/config.env` with the following variables:
   ```env
   # Database
   DB_URI=mongodb://localhost:27017/mern-ecommerce

   # JWT
   JWT_SECRET_KEY=your_jwt_secret
   JWT_EXPIRES_IN=7d

   # Server
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   RESULT_PER_PAGE=10

   # Stripe Payment
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...

   # Cookies
   COOKIE_EXPIRES=7

   # Email (Amazon SES)
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SERVICE=SES
   SMTP_MAIL=your-email@example.com
   SMTP_PASSWORD=your-smtp-password

   # AWS S3
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_BUCKET_NAME=your_bucket_name
   AWS_BUCKET_REGION=us-east-1
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start backend server
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

### Production Build
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Start production server
npm run production
```

## 🐳 Docker Deployment

The project includes Docker support for easy deployment.

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/user/register` - User registration
- `POST /api/v1/user/login` - User login
- `POST /api/v1/user/logout` - User logout
- `POST /api/v1/user/forgot-password` - Password reset request

### Products
- `GET /api/v1/products` - Get all products
- `POST /api/v1/product/new` - Create product (Admin)
- `GET /api/v1/product/:id` - Get product details
- `PUT /api/v1/product/:id` - Update product (Admin)
- `DELETE /api/v1/product/:id` - Delete product (Admin)

### Orders
- `POST /api/v1/order/new` - Create new order
- `GET /api/v1/orders/me` - Get user's orders
- `GET /api/v1/order/:id` - Get order details
- `PUT /api/v1/order/:id` - Update order status (Admin)

### Payments
- `POST /api/v1/payment/process` - Process payment
- `GET /api/v1/stripeapikey` - Get Stripe API key

### Coupons
- `POST /api/v1/coupon/new` - Create coupon (Admin)
- `GET /api/v1/coupons` - Get all coupons (Admin)
- `DELETE /api/v1/coupon/:id` - Delete coupon (Admin)

## 🚀 Deployment

### Heroku
1. Create a `Procfile` in the root directory:
   ```
   web: npm run start:production
   ```

2. Set environment variables in Heroku dashboard

3. Deploy:
   ```bash
   git push heroku main
   ```

### Other Platforms
The application can be deployed on any platform supporting Node.js:
- AWS EC2
- DigitalOcean
- Vercel (frontend)
- Railway
- Render

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Upcoming Features

- [ ] Advanced filtering functionalities
- [ ] Multilingual support
- [ ] AI-powered recommendation system
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Social media integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Anant Duhan**
- GitHub: [@AnantDuhan](https://github.com/AnantDuhan)
- LinkedIn: [@AnantDuhan](https://linkedin.com/in/AnantDuhan)

## 🙏 Acknowledgments

- Thanks to the MERN stack community
- Stripe for payment processing
- AWS for cloud services
- All contributors and users

---

⭐ If you found this project helpful, please give it a star!

## Install

Some basic git commands are:

```git
$ git clone https://github.com/AnantDuhan/MERN-Ecommerce.git
$ cd MERN-Ecommerce
$ npm install
```

**For Backend** - `npm install`
**For Frontend** - `cd frontend` `npm install`

## Env Variables

Make Sure to Create a config.env file in backend/config directory that include:

- DB_URI & JWT_SECRET_KEY & JWT_EXPIRES_IN
- PORT, FRONTEND_URL & RESULT_PER_PAGE
- STRIPE_PUBLISHABLE_KEY & STRIPE_SECRET_KEY
- COOKIE_EXPIRES
- SMTP_HOST, SMTP_PORT & SMTP_SERVICE
- SMTP_MAIL & SMTP_PASSWORD
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME & AWS_BUCKET_REGION

## Heroku Deployment

```
> Create a Procfile in the root directory of your application with the following command **web: npm run start:production**
```

## Simple build for production

```
$ npm run production
```

## Run the application for development

**for frontend**

```
$ npm start
```

**for backend**

```
$ npm run dev
```

## Run the application for production

```
$ npm run start:production
```

## Languages & tools

- [Mongoose](https://mongoosejs.com/)
- [Express](https://expressjs.com/)
- [React](https://reactjs.org/)
- [Node](https://nodejs.org/en/)
- [AWS-S3](https://aws.amazon.com/s3/)
- [Stripe](https://dashboard.stripe.com/dashboard)

## Code Formatter

- Add a `.vscode` directory
- Create a file `settings.json` inside `.vscode`
- Install Prettier - Code formatter in VSCode
- Add the following snippet:

```json
{
    "editor.formatOnSave": true,
    "prettier.singleQuote": true,
    "prettier.arrowParens": "avoid",
    "prettier.jsxSingleQuote": true,
    "prettier.trailingComma": "none",
    "javascript.preferences.quoteStyle": "single"
}
```

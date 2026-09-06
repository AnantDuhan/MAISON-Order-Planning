[![Netlify Status](https://api.netlify.com/api/v1/badges/bfa19719-6a66-4a86-b462-22666ef3e580/deploy-status?branch=main)](https://app.netlify.com/projects/orderplanning/deploys)

# MERN Ecommerce Platform

A full-stack e-commerce application built with MongoDB, Express, React, and Node.js. It includes customer shopping flows, an admin workspace, Stripe payments, AWS S3 image storage, transactional email, Redis caching, AI-assisted product features, and real-time product updates.

## 🚀 Features

### 🛒 Customer Features
- **User Authentication & Security**
  - Secure registration and login with JWT tokens
 `POST /api/v1/register` - User registration (`multipart/form-data`, image field: `image`)
 `POST /api/v1/login` - User login
 `GET /api/v1/logout` - User logout
 `POST /api/v1/password/forgot` - Password reset request
 `PUT /api/v1/password/reset/:token` - Reset password
 `GET /api/v1/me` - Current user details

- **Product Discovery**
 `POST /admin/add-product` - Create product (Admin, multipart image field: `product`)
 `PUT /api/v1/admin/update/product/:id` - Update product (Admin)
 `DELETE /admin/product/:id` - Delete product (Admin)
 `POST /api/v1/review` - Create a review
 `POST /api/v1/:id/summerize-reviews` - Generate an admin AI review summary

- **Shopping Experience**
 `POST /api/v1/order/:id/return` - Request a return
 `POST /api/v1/reorder` - Reorder a previous order
 `GET /api/v1/admin/orders` - List all orders (Admin)
 `GET /api/v1/admin/returns` - List returns (Admin)
 `GET /api/v1/admin/refunds` - List refunds (Admin)
  - Order tracking and history

 `POST /api/v1/payment` - Process payment
  - Contact form for inquiries
  - Return and refund request system
 `POST /api/v1/coupon` - Create coupon (Admin)
 `GET /api/v1/coupons/all` - Get all coupons
  - User profiles with avatar upload
  - Wishlist management
 `GET /api/v1/admin/analytics?range=7d|30d|90d|12m|all` - Aggregated dashboard analytics (Admin)
 `GET /api/v1/admin/stats` - Lightweight product, order, user, return, refund, and stock counts (Admin)
  - Order history and reordering
  - Personalized recommendations (AI-powered embeddings)
 `GET /api/v1/health` - Backend health check
 `GET /api-docs` - Swagger UI
 `GET /api-docs.json` - OpenAPI JSON
  - WhatsApp number captured during registration

### 👨‍💼 Admin Features
- **Dashboard Management**
  - Lightweight product, order, user, return, refund, and stock statistics
  - Date-range analytics with revenue, order, product, return, refund, and coupon metrics
  - User management and analytics
  - Order management and fulfillment
  - Product inventory control

- **Product Management**
  - Create, update, and delete products
  - Category management
  - Stock level monitoring
  - PNG, JPEG/JPG, and WebP image uploads to AWS S3

- **Order Processing**
  - View and update order status
  - Handle returns and refunds
  - Payment tracking

- **Marketing Tools**
  - Coupon code creation and management
  - Email campaigns and notifications

### 🔧 Technical Features
- **Performance Optimization**
  - Redis and Upstash Redis caching for product and user-specific order data
  - Aggregation-based admin analytics
  - Route-level frontend code splitting with React lazy loading
  - Database query and cache invalidation improvements

- **Security**
  - Input validation and sanitization
  - Secure payment processing
  - CORS configuration
  - Rate limiting

- **Communication**
  - Email notifications via Amazon SES
  - Automated order confirmations
  - Password reset emails
  - Socket.IO events for product, review, and AI-summary updates

- **Testing & Quality**
  - Backend controller and unit tests with Mocha and Sinon
  - Code quality assurance
  - Error handling, logging, and a React render-error boundary

- **API Documentation**
  - Swagger UI at `/api-docs`
  - OpenAPI JSON at `/api-docs.json`

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
- **Tailwind CSS and CSS** - Styling
- **Socket.IO Client** - Real-time updates
- **Material UI and React Icons** - Interface components

### DevOps & Tools
- **Docker** - Containerization
- **Git** - Version control
- **NPM** - Package management
- **VS Code** - Development environment

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis or Upstash Redis (optional, for caching)
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
  Create `backend/config/config.env` locally. Never commit credentials or copy real secrets into documentation.
   ```env
  DB_URI=mongodb://localhost:27017/e-commerce
  DB_HOSTED_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
   JWT_SECRET_KEY=your_jwt_secret
   JWT_EXPIRES_IN=7d
   PORT=4000
   FRONTEND_URL=http://localhost:3000
  RESULT_PER_PAGE=12
  COOKIE_EXPIRES=1
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
  SMTP_HOST=smtp.example.com
   SMTP_PORT=587
  SMTP_SERVICE=gmail-or-ses
   SMTP_MAIL=your-email@example.com
   SMTP_PASSWORD=your-smtp-password
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_BUCKET_NAME=your_bucket_name
   AWS_BUCKET_REGION=us-east-1
  UPSTASH_REDIS_REST_URL=https://<instance>.upstash.io
  UPSTASH_REDIS_REST_TOKEN=your_token
  GOOGLE_OAUTH_CLIENT_ID=your_client_id
  GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
  GEMINI_API_KEY=your_gemini_key
   ```

  Optional integrations include Stripe live keys, Twilio, reCAPTCHA, Elastic Cloud, and `REDIS_URL` for a local Redis instance. The frontend uses the proxy configured in `frontend/package.json` during local development; set `REACT_APP_API_URL` when deploying it separately.

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Terminal 1: backend on port 4000
npm run dev

# Terminal 2: frontend on port 3000
cd frontend
npm start
```

### Production Build
```bash
cd frontend
npm run build
cd ..
npm start
```

The backend health check is available at `GET http://localhost:4000/api/v1/health`.

## 🧪 Tests

```bash
# Backend tests
npm test

# Frontend production build
cd frontend
npm run build
```

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

The Compose setup starts the application, MongoDB, and Redis. The application is exposed on port `4001` while the container listens on port `4000`.

## 📡 API Endpoints

### Authentication
- `POST /api/v1/register` - User registration (`multipart/form-data`, image field: `image`)
- `POST /api/v1/login` - User login
- `GET /api/v1/logout` - User logout
- `POST /api/v1/password/forgot` - Password reset request
- `PUT /api/v1/password/reset/:token` - Reset password
- `GET /api/v1/me` - Current user details

### Products
- `GET /api/v1/products` - Get products with search, filters, and pagination
- `GET /api/v1/product/:id` - Get product details
- `POST /admin/add-product` - Create product (Admin, multipart image field: `product`)
- `PUT /api/v1/admin/update/product/:id` - Update product (Admin)
- `DELETE /admin/product/:id` - Delete product (Admin)
- `POST /api/v1/review` - Create a review
- `POST /api/v1/:id/summerize-reviews` - Generate an admin AI review summary

### Orders
- `POST /api/v1/order/new` - Create new order
- `GET /api/v1/orders/me` - Get user's orders
- `GET /api/v1/order/:id` - Get order details
- `POST /api/v1/order/:id/return` - Request a return
- `POST /api/v1/reorder` - Reorder a previous order
- `GET /api/v1/admin/orders` - List all orders (Admin)
- `GET /api/v1/admin/returns` - List returns (Admin)
- `GET /api/v1/admin/refunds` - List refunds (Admin)

### Payments and coupons
- `POST /api/v1/payment` - Process payment
- `GET /api/v1/stripeapikey` - Get Stripe API key
- `POST /api/v1/coupon` - Create coupon (Admin)
- `GET /api/v1/coupons/all` - Get all coupons

### Admin analytics
- `GET /api/v1/admin/analytics?range=7d|30d|90d|12m|all` - Aggregated dashboard analytics (Admin)
- `GET /api/v1/admin/stats` - Lightweight product, order, user, return, refund, and stock counts (Admin)

### Documentation and health
- `GET /api/v1/health` - Backend health check
- `GET /api-docs` - Swagger UI
- `GET /api-docs.json` - OpenAPI JSON

## 🖼️ Uploads and real-time updates

Product and profile uploads use Multer memory storage before being written to AWS S3. Product forms upload the original `File` objects rather than base64 strings, avoiding multipart field-size errors. Accepted image types are PNG, JPEG/JPG, and WebP.

Product pages connect to the backend Socket.IO server on port 4000. Product, review, and generated-summary events can update the page in real time. The React development server also opens its own hot-reload WebSocket on port 3000; browser messages about a page entering the Back-Forward Cache are normal during navigation.

## 🗃️ Data migration

Several reference fields were corrected from numeric to string types to match the string-based Snowflake document IDs. Existing databases can be repaired with:

```bash
node backend/scripts/fixRefTypes.js          # dry run
node backend/scripts/fixRefTypes.js --apply  # apply conversions
```

Back up the database before using `--apply`.

## 🚀 Deployment

### Backend on Render

1. **Connect Repository**
   - Go to [Render](https://render.com) and sign up/login
   - Click "New" → "Blueprint" or "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: MERN-Ecommerce-Backend
   - **Environment**: Docker
   - **Region**: Oregon (or your preferred region)
   - **Branch**: main
   - **Build Command**: `npm install` (handled by Dockerfile)
   - **Start Command**: `node backend/server.js` (handled by Dockerfile)

3. **Environment Variables**
   Set the following in Render's Environment section:
   ```env
   DB_URI=your_mongodb_atlas_uri
   JWT_SECRET_KEY=your_jwt_secret
   JWT_EXPIRES_IN=7d
   PORT=4000
   FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
   RESULT_PER_PAGE=10
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   COOKIE_EXPIRES=7
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SERVICE=SES
   SMTP_MAIL=your-email@example.com
   SMTP_PASSWORD=your-smtp-password
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_BUCKET_NAME=your_bucket_name
   AWS_BUCKET_REGION=us-east-1
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy your backend
   - Note the service URL (e.g., `https://mern-ecommerce-backend.onrender.com`)

### Frontend on Vercel

1. **Connect Repository**
   - Go to [Vercel](https://vercel.com) and sign up/login
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**
   - **Project Name**: MERN-Ecommerce-Frontend
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

3. **Environment Variables**
   Set in Vercel's Environment Variables section:
   ```env
   REACT_APP_API_URL=https://your-render-backend-url.onrender.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your frontend
   - Get the deployment URL (e.g., `https://mern-ecommerce-frontend.vercel.app`)

### Other Platforms

The application can be deployed on any platform supporting Node.js:
- **AWS EC2/ECS**: Use Docker or direct Node.js deployment
- **DigitalOcean App Platform**: Connect repo and configure
- **Railway**: Automatic deployment from GitHub
- **Fly.io**: Docker-based deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

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

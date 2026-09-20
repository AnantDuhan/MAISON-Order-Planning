[![Netlify Status](https://api.netlify.com/api/v1/badges/6b235f56-a1b8-484c-af2c-5a0c5fff916b/deploy-status)](https://app.netlify.com/projects/maisonorderplanning/deploys)

# MAISON — E-Commerce & Order Planning Platform

<p align="center">
  <strong>A production-oriented full-stack e-commerce platform with real-time order processing, secure authentication, payments, AI-powered reviews, caching, search, background jobs, and an administrative analytics workspace.</strong>
</p>

<p align="center">
  <a href="https://maisonorderplanning.in">Live Application</a>
  •
  <a href="https://github.com/AnantDuhan/MAISON-Order-Planning">GitHub</a>
  •
  <a href="https://maison-order-planning.onrender.com/api-docs">API Documentation</a>
</p>

---

## 📌 Overview

**MAISON** is a full-stack e-commerce platform designed around the complete commerce lifecycle:

**Product Discovery → Cart → Checkout → Payment → Order Processing → Shipping → Delivery → Returns → Refunds**

The application combines a modern React frontend with a Node.js/Express backend, MongoDB persistence, Redis caching, Elasticsearch-powered product search, Socket.IO real-time communication, Cashfree payments, AWS S3 storage, Google OAuth, TOTP-based two-factor authentication, and Gemini-powered AI features.

The platform also includes an administration workspace for managing products, orders, users, coupons, returns, refunds, and business analytics.

---

## ✨ Key Features

### 🛍️ Customer Experience

* Secure registration and login
* JWT-based authentication using HTTP-only cookies
* Google OAuth authentication
* TOTP-based two-factor authentication (2FA)
* Email-based password reset
* Product catalogue with:

  * Search
  * Filtering
  * Pagination
  * Product galleries
  * Image lightbox
* Product reviews and ratings
* AI-generated review summaries using Google Gemini
* Wishlist management
* Automated wishlist reminder emails
* Shopping cart
* Multi-step checkout
* Saved address book
* Cashfree payment integration
* Order history
* One-click reorder
* Real-time order status updates
* Return requests
* Refund tracking
* Membership/subscription plans
* Newsletter subscription
* Newsletter unsubscribe flow

---

## 👨‍💼 Admin Workspace

MAISON includes an administrative workspace for managing the platform.

### Dashboard

Provides analytics across configurable time ranges:

* Revenue
* Orders
* Products
* Returns
* Refunds
* Coupons
* General platform statistics

Supported analytics ranges include:

```text
7d
30d
90d
12m
all
```

### Product Management

Administrators can:

* Create products
* Update products
* Delete products
* Upload product images
* Manage product information
* Maintain product catalogue data

Images are uploaded to **Amazon S3**.

### Order Management

Administrators can:

* View orders
* Update order status
* Process returns
* Manage refunds
* Trigger real-time order-status updates

### User Management

* View users
* Manage users
* Manage user roles
* Restrict administrative routes to authorized administrators

### Coupons

Administrators can create discount codes with:

* Discount values
* Optional expiration dates

---

# 🏗️ Architecture

MAISON follows a full-stack architecture consisting of a React client and Node.js backend.

```text
                         ┌─────────────────────────┐
                         │       React Client      │
                         │                         │
                         │ Redux / Redux Thunk     │
                         │ React Router            │
                         │ Material UI             │
                         │ Tailwind CSS            │
                         └────────────┬────────────┘
                                      │
                                      │ HTTP / Socket.IO
                                      ▼
                         ┌─────────────────────────┐
                         │     Node.js / Express   │
                         │                         │
                         │ REST API                │
                         │ Authentication          │
                         │ Orders                  │
                         │ Payments                │
                         │ Reviews                 │
                         │ Admin                   │
                         │ Background Jobs         │
                         └──────┬──────┬───────────┘
                                │      │
                    ┌───────────┘      └──────────────┐
                    ▼                                 ▼
          ┌──────────────────┐              ┌──────────────────┐
          │     MongoDB      │              │      Redis       │
          │                  │              │                  │
          │ Users            │              │ Caching          │
          │ Products         │              │ Socket.IO Adapter│
          │ Orders           │              │ Background Jobs  │
          │ Reviews          │              └──────────────────┘
          └──────────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │  Elasticsearch   │
          │                  │
          │ Product Search   │
          └──────────────────┘

        External Integrations
        ──────────────────────

        AWS S3       → Product/Image Storage
        Cashfree     → Payments & Membership
        Google OAuth → Authentication
        Gemini       → AI Review Summaries
        SMTP         → Transactional Email
```

The backend also supports Redis-based Socket.IO adapters so events can be propagated between multiple application instances when Redis is configured.

---

# 🧰 Technology Stack

## Frontend

| Technology                 | Purpose                 |
| -------------------------- | ----------------------- |
| React 18                   | UI                      |
| Redux                      | Global state            |
| Redux Thunk                | Async state operations  |
| React Router               | Client-side routing     |
| Axios                      | HTTP communication      |
| Tailwind CSS               | Utility-first styling   |
| Material UI                | UI components           |
| Socket.IO Client           | Real-time communication |
| Chart.js                   | Analytics visualization |
| React Toastify             | Notifications           |
| React Helmet Async         | Document metadata       |
| Yet Another React Lightbox | Product image galleries |

The frontend is currently based on React 18 and uses React Router, Redux/Redux Thunk, Socket.IO Client, Material UI, Chart.js, and Tailwind CSS.

---

## Backend

| Technology    | Purpose                      |
| ------------- | ---------------------------- |
| Node.js       | Runtime                      |
| Express 5     | REST API                     |
| MongoDB       | Primary database             |
| Mongoose      | MongoDB ODM                  |
| Redis         | Caching / distributed events |
| Upstash Redis | Managed Redis                |
| Elasticsearch | Product search               |
| Socket.IO     | Real-time events             |
| JWT           | Authentication               |
| Speakeasy     | TOTP 2FA                     |
| Google OAuth  | Social authentication        |
| BullMQ        | Background job processing    |
| Nodemailer    | Email delivery               |
| EJS           | Email templates              |
| Cashfree      | Payments & subscriptions     |
| AWS S3        | Image storage                |
| Google Gemini | AI review summaries          |
| Swagger       | API documentation            |
| Pino          | Application logging          |

The current backend dependencies include Express 5, Mongoose, Redis, BullMQ, Socket.IO, Elasticsearch, AWS S3, Cashfree-related integrations, Google AI packages, JWT, Speakeasy, Nodemailer, Swagger and rate limiting.

---

# 🔐 Security

Security is treated as a first-class part of the application.

### Authentication

MAISON supports:

* JWT authentication
* HTTP-only cookies
* Google OAuth
* Password reset through email
* TOTP-based two-factor authentication

### Two-Factor Authentication

The application supports **TOTP-based 2FA**, adding an additional authentication factor beyond the user's password.

Typical authentication flow:

```text
Password
   │
   ▼
Credentials Valid?
   │
   ▼
2FA Enabled?
   │
   ├── No ──────► Authenticate
   │
   └── Yes
        │
        ▼
   TOTP Verification
        │
        ▼
     Authenticate
```

### API Protection

The backend uses rate limiting, including stricter protection for authentication endpoints.

Additional security measures include:

* HTTP-only authentication cookies
* Password hashing
* Protected administrative routes
* Secret-protected scheduled-job endpoints
* Environment-based credentials
* No secrets committed to source control

---

# ⚡ Performance & Scalability

MAISON includes several performance-oriented mechanisms.

### Redis Caching

Frequently accessed product and order information can be cached through Redis/Upstash.

```text
Client
   │
   ▼
Express API
   │
   ├── Redis Cache ──► Cache Hit
   │
   └── MongoDB ──────► Cache Miss
                         │
                         ▼
                    Store in Redis
```

### Database Indexing

MongoDB indexes are used for frequently accessed query paths, including:

* Product filtering
* Product sorting
* Product search
* Order history

### Elasticsearch

Elasticsearch is used for product-search functionality.

The backend initializes the product search index when the application starts.

### Response Compression

HTTP responses are compressed using gzip-compatible response compression.

### Frontend Code Splitting

Frontend routes use lazy loading to reduce the amount of JavaScript required during initial application startup.

### Distributed Socket.IO

When Redis is configured, Socket.IO uses the Redis adapter to synchronize events between multiple application instances.

---

# 🔄 Real-Time Communication

MAISON uses **Socket.IO** for real-time application events.

Examples include:

### Order Updates

```text
Processing
    │
    ▼
Shipped
    │
    ▼
Delivered
```

The customer interface can receive order-status changes without requiring a page refresh.

### Product Events

Product and review-related events can also be propagated through Socket.IO.

For multi-instance deployments, Redis can be used as the Socket.IO adapter so clients connected to different application instances can still receive the appropriate events.

---

# 🤖 AI-Powered Features

MAISON integrates **Google Gemini** to generate summaries from customer reviews.

Instead of forcing customers to read every individual review, the application can generate a condensed summary of the available review data.

```text
Customer Reviews
       │
       ▼
   Review Data
       │
       ▼
    Gemini AI
       │
       ▼
 Review Summary
       │
       ▼
    Product UI
```

The backend includes Google AI dependencies and exposes functionality for generating review summaries.

---

# 💳 Payments & Membership

MAISON currently uses **Cashfree** for payment functionality.

Supported functionality includes:

* E-commerce checkout payments
* Membership/subscription payments
* Monthly membership configuration
* Yearly membership configuration
* Payment return handling
* Payment webhooks

> Stripe client dependencies remain in the frontend from an earlier payment integration, while the current documented payment flow uses Cashfree.

---

# 📧 Email System

The platform uses **Nodemailer with pooled SMTP connections** and EJS templates.

Email functionality includes:

* Account activation
* Order confirmation
* Password reset
* Contact emails
* Newsletter
* Wishlist reminders

The SMTP transport is warmed during server startup so the first user-facing email does not incur the initial connection overhead.

---

# ⏱️ Background Jobs

MAISON supports automated email jobs for:

### Wishlist Reminders

Users with saved wishlist items can receive reminder emails.

### Weekly Newsletter

Newsletter subscribers can receive scheduled newsletters.

The recommended production architecture triggers these jobs externally through protected endpoints.

```text
GitHub Actions
      │
      │ scheduled request
      ▼
/api/v1/jobs/wishlist
/api/v1/jobs/newsletter
      │
      ▼
 Background Job
      │
      ▼
   SMTP Pool
      │
      ▼
    Users
```

The repository's GitHub Actions workflow currently schedules wishlist reminders daily and the newsletter weekly, with `BACKEND_URL` and `CRON_SECRET` supplied through GitHub repository secrets.

### Scheduled Job Security

Job endpoints require:

```http
x-cron-secret: <CRON_SECRET>
```

This prevents arbitrary clients from triggering the email jobs.

---

# 📚 API Documentation

MAISON exposes Swagger/OpenAPI documentation.

Once the backend is running:

```text
/api-docs
```

Open:

```text
http://localhost:4000/api-docs
```

The generated OpenAPI document is also available at:

```text
/api-docs.json
```

---

# 🔌 API Overview

Base API path:

```text
/api/v1
```

## Authentication

```http
POST /register
POST /login
GET  /logout
GET  /me

POST /password/forgot
PUT  /password/reset/:token

POST /auth/google
```

---

## Addresses

```http
GET    /addresses
POST   /address/new
DELETE /address/:addressId
```

---

## Products

```http
GET /products
GET /product/:id

GET /admin/products
PUT /admin/update/product/:id
```

---

## Reviews

```http
POST   /review
GET    /reviews
DELETE /review/:reviewId
```

AI review summary:

```http
POST /:id/summerize-reviews
```

---

## Wishlist

```http
GET    /wishlist
POST   /wishlist/:id
DELETE /wishlist/:id
```

---

## Orders

```http
POST /order/new
GET  /orders/me
GET  /order/:id

POST /order/:id/return
POST /order/reorder/:orderId
```

Administrative order endpoints include:

```http
GET /admin/orders
GET /admin/returns
GET /admin/refunds
```

---

## Payments & Membership

```http
POST /payment
```

Additional Cashfree payment and membership endpoints are implemented in the payment and subscription routes.

---

## Analytics

```http
GET /admin/analytics?range=7d
GET /admin/stats
```

Supported analytics ranges:

```text
7d
30d
90d
12m
all
```

---

## Jobs

```http
POST /jobs/newsletter
POST /jobs/wishlist
```

These endpoints require the configured cron secret.

---

## Health

```http
GET /api/v1/health
```

---

# 📁 Project Structure

A simplified view of the repository:

```text
MAISON-Order-Planning/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/
│   ├── utils/
│   │
│   ├── newsletterJob.js
│   ├── wishlistJob.js
│   ├── worker.js
│   ├── app.js
│   └── server.js
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── actions/
│       ├── components/
│       ├── constants/
│       ├── reducers/
│       ├── screens/
│       └── ...
│
├── .github/
│   └── workflows/
│       └── cron.yml
│
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js 18+
* npm
* MongoDB
* Git

Optional services:

* Redis / Upstash Redis
* Elasticsearch
* AWS S3
* SMTP provider
* Google OAuth
* Google Gemini API
* Cashfree

The project is developed against modern Node.js versions; the repository documentation currently specifies Node.js 18+ and notes development on Node 22.

---

# 📥 Installation

Clone the repository:

```bash
git clone https://github.com/AnantDuhan/MAISON-Order-Planning.git
cd MAISON-Order-Planning
```

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

---

# ⚙️ Environment Configuration

Create:

```text
backend/config/config.env
```

Example:

```env
# Application
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DB_URI=mongodb://localhost:27017/e-commerce

# Authentication
JWT_SECRET_KEY=your_jwt_secret
JWT_EXPIRES_IN=5d
COOKIE_EXPIRES=5

# Pagination
RESULT_PER_PAGE=8

# Scheduled Jobs
CRON_SECRET=your_random_secret
ENABLE_IN_PROCESS_CRON=false

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_MAIL=your-email@example.com
SMTP_PASSWORD=your-password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# Redis / Upstash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
REDIS_URL=

# Cashfree
CASHFREE_APP_ID=your-app-id
CASHFREE_SECRET_KEY=your-secret
CASHFREE_ENVIRONMENT=SANDBOX
CASHFREE_RETURN_URL=
CASHFREE_WEBHOOK_URL=
CASHFREE_MONTHLY_AMOUNT=
CASHFREE_YEARLY_AMOUNT=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_BUCKET_REGION=
```

Never commit production credentials, API keys, database credentials, or JWT secrets.

---

# 🖥️ Run Locally

## Start Backend

From the repository root:

```bash
npm run dev
```

Or:

```bash
npm start
```

Backend:

```text
http://localhost:4000
```

---

## Start Frontend

In another terminal:

```bash
cd frontend
npm start
```

Frontend:

```text
http://localhost:3000
```

---

# 🏭 Production Build

Build the React application:

```bash
cd frontend
npm run build
cd ..
```

Then start the backend:

```bash
npm start
```

In production, the Node.js backend can serve the compiled React application, allowing the frontend and backend to operate through the same origin.

---

# 🧹 Maintenance Scripts

Several database maintenance scripts are included.

Create indexes:

```bash
node backend/scripts/createIndexes.js
```

Preview ID migration:

```bash
node backend/scripts/migrateIds.js
```

Apply ID migration:

```bash
node backend/scripts/migrateIds.js --apply
```

Repair order/product references:

```bash
node backend/scripts/repairOrderProductRefs.js
```

Fix legacy reference types:

```bash
node backend/scripts/fixRefTypes.js
```

Always back up the database before running scripts that modify production data.

---

# 🧪 Development

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm start
```

Frontend production build:

```bash
cd frontend
npm run build
```

Backend worker:

```bash
npm run worker
```

---

# 🐳 Docker

If using the repository's Docker configuration:

```bash
docker-compose up --build
```

The application architecture supports running the application alongside MongoDB and Redis.

---

# 🌐 Deployment

MAISON is designed to support deployment on Node.js-compatible platforms such as:

* Render
* Railway
* Fly.io
* VPS infrastructure
* Other Node.js hosting environments

For production deployment, configure the required environment variables for:

```text
MongoDB
JWT
SMTP
Cashfree
AWS S3
Redis
Gemini
Google OAuth
Scheduled Jobs
```

The application is designed around a same-origin production model where the backend can serve the compiled React frontend.

This avoids requiring separate frontend/backend origins for the primary application flow.

---

# 🔁 Production Request Flow

A typical customer order follows:

```text
Customer
   │
   ▼
React Frontend
   │
   ▼
Express API
   │
   ├──────────────► Authentication
   │
   ├──────────────► Product / Cart
   │
   ├──────────────► MongoDB
   │
   ├──────────────► Redis
   │
   └──────────────► Cashfree
                       │
                       ▼
                    Payment
                       │
                       ▼
                     Order
                       │
                       ▼
                  Socket.IO
                       │
                       ▼
                Customer UI
```

---

# 📊 Platform Capabilities

| Area             | Capability                   |
| ---------------- | ---------------------------- |
| Authentication   | JWT + Google OAuth           |
| Account Security | TOTP 2FA                     |
| Product Search   | MongoDB + Elasticsearch      |
| Caching          | Redis / Upstash              |
| Database         | MongoDB + Mongoose           |
| Real-Time        | Socket.IO                    |
| Payments         | Cashfree                     |
| Membership       | Cashfree                     |
| Image Storage    | AWS S3                       |
| AI               | Google Gemini                |
| Email            | Nodemailer + EJS             |
| Background Jobs  | BullMQ / scheduled endpoints |
| API Docs         | Swagger/OpenAPI              |
| Analytics        | Admin dashboard              |
| Rate Limiting    | Express Rate Limit           |
| Compression      | Gzip                         |
| Deployment       | Node.js-compatible hosting   |

---

# 🛡️ Production Considerations

For production deployments:

* Use a managed MongoDB deployment such as MongoDB Atlas.
* Use a managed Redis service such as Upstash.
* Configure Elasticsearch appropriately for your workload.
* Store secrets exclusively in environment variables or a secret manager.
* Use HTTPS.
* Configure Cashfree webhooks correctly.
* Configure SMTP credentials securely.
* Configure AWS S3 with least-privilege credentials.
* Set a strong random `JWT_SECRET_KEY`.
* Set a strong random `CRON_SECRET`.
* Do not enable in-process cron when running multiple application instances.
* Back up MongoDB before maintenance migrations.

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the repository

```bash
git fork
```

### 2. Create a feature branch

```bash
git checkout -b feature/AmazingFeature
```

### 3. Commit your changes

```bash
git commit -m "Add AmazingFeature"
```

### 4. Push the branch

```bash
git push origin feature/AmazingFeature
```

### 5. Open a Pull Request

Please describe:

* What changed
* Why it changed
* How it was tested
* Any deployment or configuration changes required

---

# 📄 License

Apache License 2.0.

See [`LICENSE`](LICENSE) for details.

---

# 👨‍💻 Author

## Anant Duhan

Software Engineer | Full-Stack Developer

* GitHub: [@AnantDuhan](https://github.com/AnantDuhan)
* LinkedIn: [Anant Duhan](https://linkedin.com/in/AnantDuhan)

---

# ⭐ Support

If you find MAISON useful or interesting, consider giving the repository a ⭐.

**Repository:**
https://github.com/AnantDuhan/MAISON-Order-Planning

---

<p align="center">
  Built with React, Node.js, MongoDB, Redis, Elasticsearch, Socket.IO, AWS, Cashfree and Gemini AI.
</p>


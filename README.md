[![Netlify Status](https://api.netlify.com/api/v1/badges/bfa19719-6a66-4a86-b462-22666ef3e580/deploy-status?branch=main)](https://app.netlify.com/projects/orderplanning/deploys)

# Maison — MERN E‑Commerce Platform

A full‑stack e‑commerce application built with MongoDB, Express, React, and Node.js, with a luxury / editorial storefront (Tailwind CSS, light & dark themes). It covers the complete commerce lifecycle — browse → cart → checkout → payment → order pipeline (place → ship → deliver → return → refund) — plus real‑time order updates, an admin workspace, transactional and scheduled email, Redis caching, and AI‑assisted product features.

## 🚀 Features

### 🛒 Customer
- **Authentication & security** — JWT (httpOnly cookie) sessions, Google OAuth sign‑in, two‑factor auth (TOTP), password reset by email
- **Product discovery** — catalogue with search, filters, and pagination; rich product pages with an image gallery / lightbox
- **Reviews & ratings** — customer reviews plus **AI‑generated review summaries** (Google Gemini)
- **Product Q&A** — ask questions on a product page and read answers; admins answer inline and the asker is emailed on reply
- **Wishlist** — save items for later, with **daily wishlist‑reminder emails**
- **Cart & checkout** — multi‑step checkout with a saved **address book** (pick a saved shipping address at checkout)
- **Orders** — order history, one‑click **reorder**, and **real‑time order status** (Processing → Shipped → Delivered) over Socket.io
- **Returns & refunds** — request returns and track refund status
- **Plus membership** — subscription tier (Cashfree)
- **Newsletter** — subscribe / unsubscribe with a weekly digest email

### 👨‍💼 Admin
- Dashboard with date‑range **analytics** (revenue, orders, products, returns, refunds, coupons) and lightweight count stats
- **Products** — create, update, delete; image uploads (PNG/JPEG/WebP) to AWS S3
- **Orders** — view and advance status (emits real‑time updates), handle returns and refunds
- **Users** — management and roles
- **Coupons** — create codes with a discount and optional expiry
- Admin routes are guarded so only authenticated admins can reach them

### 🔧 Platform & performance
- Short, URL‑friendly 8‑character document IDs (`nanoid`)
- MongoDB indexes for hot query paths (catalogue filter/sort, order history, product text search)
- Gzip response compression
- Redis (Upstash) caching for product and order data
- **Rate limiting** — a general API limiter plus a strict limiter on auth endpoints (`express-rate-limit`)
- Pooled SMTP transport (Nodemailer) so transactional email doesn’t block responses
- Socket.io for real‑time product and order events
- Swagger API docs at `/api-docs`
- Route‑level frontend code splitting (React lazy loading)

### 📨 Email (EJS templates)
Account activation, order confirmation, password reset, contact, **question reply**, **weekly newsletter**, and **wishlist reminder**.

## 🛠️ Tech Stack

**Backend:** Node.js, Express, MongoDB + Mongoose, Socket.io, JWT, `speakeasy` (2FA), Nodemailer (pooled SMTP) + EJS, Cashfree (payments), Google Generative AI (Gemini), Upstash Redis, `express-rate-limit`, AWS S3, Swagger.

**Frontend:** React, Redux + redux‑thunk, React Router, Tailwind CSS, MUI, Axios, Socket.io‑client, Chart.js / Recharts, React‑Toastify.

> Payments are integrated via **Cashfree** (order checkout and membership). Stripe client libraries also remain in the frontend from an earlier integration.

## 📋 Prerequisites
- Node.js 18+ (developed on Node 22)
- MongoDB (local or Atlas)
- Optional: Upstash Redis (caching), AWS S3 (image storage), SMTP credentials (email), Cashfree, Google OAuth, Gemini API key

## 🚀 Installation

```bash
git clone https://github.com/AnantDuhan/MERN-Ecommerce.git
cd MERN-Ecommerce

# backend dependencies (root package.json)
npm install

# frontend dependencies
cd frontend && npm install && cd ..
```

### Environment setup
Create `backend/config/config.env` locally. Never commit real secrets.

```env
# Core
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DB_URI=mongodb://localhost:27017/e-commerce      # or DB_HOSTED_URI for Atlas
JWT_SECRET_KEY=your_jwt_secret
JWT_EXPIRES_IN=5d
COOKIE_EXPIRES=5
RESULT_PER_PAGE=8

# Email (pooled SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_MAIL=your-email@example.com
SMTP_PASSWORD=your-smtp-password
NEWSLETTER_UNSUBSCRIBE_URL=                       # optional; defaults to FRONTEND_URL/api/v1/unsubscribe

# Integrations (optional)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GEMINI_API_KEY=your_gemini_key
UPSTASH_REDIS_REST_URL=https://<instance>.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
REDIS_URL=                                         # or REDIS_HOSTED_URL for a local/remote Redis
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_ENVIRONMENT=SANDBOX
CASHFREE_RETURN_URL=...
CASHFREE_WEBHOOK_URL=...
CASHFREE_MONTHLY_AMOUNT=...
CASHFREE_YEARLY_AMOUNT=...
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=your_bucket_name
AWS_BUCKET_REGION=us-east-1
```

Frontend (`frontend/.env`, optional):
```env
REACT_APP_SOCKET_URL=http://localhost:4000        # must match the backend port for real-time features
```
> The frontend dev server proxies API requests to `http://localhost:4000`, so run the backend on `PORT=4000` in development. Socket.io defaults to the same URL.

## 🏃 Running the app

```bash
# Terminal 1 — backend (repo root)
npm run dev            # nodemon, or: npm start

# Terminal 2 — frontend
cd frontend && npm start
```
Client: `http://localhost:3000` · API: `http://localhost:4000` · health check: `GET /api/v1/health`.

### Production build
```bash
cd frontend && npm run build && cd ..
npm start
```

## ⏱️ Background jobs
Registered in `server.js` and run in‑process on a daily interval:
- **Weekly newsletter** (`backend/newsletterJob.js`) — digest of recent products; each subscriber eligible at most once every 7 days.
- **Wishlist reminders** (`backend/wishlistJob.js`) — emails users who have items saved in their wishlist.

> Both run inside the web process. If you scale to multiple instances, move them to a single worker (or a dedicated scheduler) to avoid duplicate sends.

## 🗃️ Maintenance scripts
Run from the repo root with a valid `DB_URI` (back up the database before any `--apply`):
```bash
node backend/scripts/createIndexes.js             # create the MongoDB indexes the app queries on
node backend/scripts/migrateIds.js                # dry run: preview re-keying documents to short IDs
node backend/scripts/migrateIds.js --apply        # perform the ID migration
node backend/scripts/repairOrderProductRefs.js    # repair order → product references
node backend/scripts/fixRefTypes.js               # (legacy) numeric→string ref type fixes; --apply to write
```
`migrateIds.js` is a dry run by default and is re‑runnable (already‑migrated documents are skipped).

## 📡 API overview
Base path: `/api/v1`.

**Auth**
- `POST /register` (multipart, image field `image`) · `POST /login` · `GET /logout`
- `POST /password/forgot` · `PUT /password/reset/:token` · `GET /me`
- `POST /auth/google`
- *(auth endpoints are rate‑limited)*

**Address book**
- `GET /addresses` · `POST /address/new` · `DELETE /address/:addressId`

**Products & reviews**
- `GET /products` · `GET /product/:id`
- `PUT /admin/update/product/:id` (admin) · `GET /admin/products` (admin)
- `POST /review` · `GET /reviews` · `DELETE /review/:reviewId`
- `POST /:id/summerize-reviews` (admin — AI review summary)

**Product Q&A**
- `GET /product/:id/questions`
- `POST /product/:id/question` (auth)
- `PUT /product/:id/question/:questionId/answer` (admin)

**Wishlist**
- `GET /wishlist` · `POST /wishlist/:id` · `DELETE /wishlist/:id`

**Orders**
- `POST /order/new` · `GET /orders/me` · `GET /order/:id`
- `POST /order/:id/return` · `POST /order/reorder/:orderId`
- `GET /admin/orders` · `GET /admin/returns` · `GET /admin/refunds` (admin)

**Payments, coupons & membership**
- `POST /payment`
- `POST /coupon` (admin) · `GET /coupons/all`
- Cashfree order & membership endpoints (see `routes/payment.js`, `routes/subscription.js`)

**Admin analytics**
- `GET /admin/analytics?range=7d|30d|90d|12m|all` · `GET /admin/stats`

**Docs & health**
- `GET /api/v1/health` · `GET /api-docs` (Swagger UI) · `GET /api-docs.json`

## 🖼️ Uploads & real‑time
Uploads use Multer memory storage before writing to AWS S3 (PNG/JPEG/WebP). Product pages and order pages open a Socket.io connection to the backend; product/review/summary events and order‑status changes update the UI in real time. Set `REACT_APP_SOCKET_URL` to the backend origin for any non‑default setup.

## 🐳 Docker
```bash
docker-compose up --build
```
Starts the app, MongoDB, and Redis. The app is exposed on host port `4001` (container `4000`).

## 🚀 Deployment
**Backend (Render):** Docker environment, start command `node backend/server.js`, set the environment variables above (`DB_URI`, `JWT_SECRET_KEY`, `FRONTEND_URL`, SMTP, Cashfree, AWS, Upstash, …).

**Frontend (Vercel):** framework preset Create React App, root directory `frontend`, build `npm run build`, output `build`. Set `REACT_APP_SOCKET_URL` (and any API base URL) to your deployed backend.

Any Node‑friendly host works (AWS, DigitalOcean, Railway, Fly.io).

## 🤝 Contributing
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
MIT — see [LICENSE](LICENSE).

## 👨‍💻 Author
**Anant Duhan** — GitHub [@AnantDuhan](https://github.com/AnantDuhan) · LinkedIn [@AnantDuhan](https://linkedin.com/in/AnantDuhan)

---
⭐ If you found this project helpful, please give it a star!

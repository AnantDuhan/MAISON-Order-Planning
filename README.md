# ECOMMERCE - MERN

## Demo

This full-stack e-commerce application is built using cutting-edge technologies to provide users with a seamless shopping experience. Below are some key features and technologies used in the development:

## Features

* **Browse and Shop:**
  * Buyers can explore store categories, products, and brands.
  * Intuitive filtering options for price, rating, and categories to enhance the search experience.

* **Admin Dashboard:**
  * Comprehensive admin dashboard to manage and control various components of the store.

* **User Engagement:**
  * Enabled user reviews, ratings, and Wishlist features to enhance user interaction.

* **Payment Integration:**
  * Integrated Stripe for secure and convenient payment processing.

* **Additional Functionality:**
  * Implemented advanced product searching and filtering functionalities.
  * Integrated coupon code functionality for discounts.
  * Seamless return and refund features for a smooth user experience.

## Technologies Used

* **Backend:**
  * Node.js provides the backend environment.
  * Express middleware handles requests, routes, and user authentication.
  * MongoDB with Mongoose schemas models the application data.

* **Frontend:**
  * React.js for building dynamic and responsive UI components.
  * Redux for managing the application's state.
  * Redux Thunk middleware for handling asynchronous redux actions.

* **Testing:**
  * Unit tests performed using Mocha and Chai in the backend to ensure robust code quality.

* **Storage:**
  * AWS-S3 utilized for efficient storage of user avatars and product images, ensuring scalability and performance.

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

* DB_URI & JWT_SECRET_KEY & JWT_EXPIRES_IN
* PORT, FRONTEND_URL & RESULT_PER_PAGE
* STRIPE_PUBLISHABLE_KEY & STRIPE_SECRET_KEY
* COOKIE_EXPIRES
* SMTP_HOST, SMTP_PORT & SMTP_SERVICE
* SMTP_MAIL & SMTP_PASSWORD
* AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME & AWS_BUCKET_REGION

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

### Code Formatter

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
      "javascript.preferences.quoteStyle": "single",
    }
```

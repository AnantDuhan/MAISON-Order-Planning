const swaggerJsdoc = require('swagger-jsdoc');

const bearerAuth = [{ bearerAuth: [] }];

const jsonBody = (schema = { type: 'object', additionalProperties: true }) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

const idParameter = (name = 'id') => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});

const response = (description = 'Successful response') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiResponse' },
    },
  },
});

const protectedOperation = (summary, tags, method, extra = {}) => ({
  summary,
  tags,
  security: bearerAuth,
  responses: {
    '200': response(),
    '401': { description: 'Authentication required' },
    '403': { description: 'Insufficient permissions' },
    ...extra.responses,
  },
  ...extra,
  ...(method === 'post' || method === 'put' || method === 'patch'
    ? { requestBody: extra.requestBody || jsonBody() }
    : {}),
});

const adminOperation = (summary, tags, extra = {}) => ({
  ...protectedOperation(summary, tags, 'get', extra),
  security: bearerAuth,
});

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MERN Ecommerce API',
      version: '2.0.0',
      description: 'API documentation for the MERN Ecommerce backend.',
    },
    servers: [
      { url: 'http://localhost:8080', description: 'Local development server' },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Authentication' },
      { name: 'Users' },
      { name: 'Products' },
      { name: 'Orders' },
      { name: 'Payments' },
      { name: 'Coupons' },
      { name: 'Analytics' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT stored in the token cookie after login.',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        Credentials: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
        },
      },
    },
    paths: {
      '/api/v1/health': { get: { summary: 'Check API health', tags: ['Health'], responses: { '200': response('The API is online') } } },
      '/api/v1/register': { post: { summary: 'Register a user', tags: ['Authentication'], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', additionalProperties: true } } } }, responses: { '201': response('User registered successfully'), '400': { description: 'Invalid request' } } } },
      '/api/v1/login': { post: { summary: 'Log in a user', tags: ['Authentication'], requestBody: jsonBody({ $ref: '#/components/schemas/Credentials' }), responses: { '200': response('Login successful'), '401': { description: 'Invalid credentials' } } } },
      '/api/v1/logout': { get: protectedOperation('Log out the current user', ['Authentication'], 'get') },
      '/api/v1/password/forgot': { post: { summary: 'Request a password reset', tags: ['Authentication'], requestBody: jsonBody(), responses: { '200': response() } } },
      '/api/v1/password/reset/{token}': { put: { summary: 'Reset a password', tags: ['Authentication'], parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }], requestBody: jsonBody(), responses: { '200': response() } } },
      '/api/v1/auth/google': { post: { summary: 'Log in with Google', tags: ['Authentication'], requestBody: jsonBody(), responses: { '200': response() } } },
      '/api/v1/me': { get: protectedOperation('Get the current user', ['Users'], 'get') },
      '/api/v1/password/update': { put: protectedOperation('Update the current password', ['Users'], 'put') },
      '/api/v1/admin/users': { get: protectedOperation('List all users', ['Users'], 'get') },
      '/api/v1/admin/user/{id}': { get: protectedOperation('Get a user', ['Users'], 'get', { parameters: [idParameter()] }), put: protectedOperation('Update a user role', ['Users'], 'put', { parameters: [idParameter()] }), delete: protectedOperation('Delete a user', ['Users'], 'delete', { parameters: [idParameter()] }) },
      '/api/v1/products': { get: { summary: 'List products', tags: ['Products'], responses: { '200': response() } } },
      '/api/v1/product/{id}': { get: { summary: 'Get product details', tags: ['Products'], parameters: [idParameter()], responses: { '200': response() } } },
      '/api/v1/admin/products': { get: protectedOperation('List products for administration', ['Products'], 'get') },
      '/api/v1/admin/update/product/{id}': { put: protectedOperation('Update a product', ['Products'], 'put', { parameters: [idParameter()] }) },
      '/api/v1/wishlist': { get: protectedOperation('List wishlist products', ['Products'], 'get') },
      '/api/v1/wishlist/{id}': { post: protectedOperation('Add a product to the wishlist', ['Products'], 'post', { parameters: [idParameter()] }), delete: protectedOperation('Remove a product from the wishlist', ['Products'], 'delete', { parameters: [idParameter()] }) },
      '/api/v1/review': { post: protectedOperation('Create a product review', ['Products'], 'post') },
      '/api/v1/reviews': { get: { summary: 'List product reviews', tags: ['Products'], responses: { '200': response() } } },
      '/api/v1/review/{reviewId}': { delete: protectedOperation('Delete a product review', ['Products'], 'delete', { parameters: [{ name: 'reviewId', in: 'path', required: true, schema: { type: 'string' } }] }) },
      '/api/v1/{id}/summerize-reviews': { post: protectedOperation('Generate a product review summary', ['Products'], 'post', { parameters: [idParameter()] }) },
      '/api/v1/order/new': { post: protectedOperation('Create an order', ['Orders'], 'post') },
      '/api/v1/order/{id}': { get: protectedOperation('Get an order', ['Orders'], 'get', { parameters: [idParameter()] }), put: protectedOperation('Update an order', ['Orders'], 'put', { parameters: [idParameter()] }), delete: protectedOperation('Delete an order', ['Orders'], 'delete', { parameters: [idParameter()] }) },
      '/api/v1/orders/me': { get: protectedOperation('List my orders', ['Orders'], 'get') },
      '/api/v1/order/{id}/return': { post: protectedOperation('Request an order return', ['Orders'], 'post', { parameters: [idParameter()] }) },
      '/api/v1/admin/orders': { get: protectedOperation('List all orders', ['Orders'], 'get') },
      '/api/v1/admin/order/{id}/refund': { post: protectedOperation('Initiate a refund', ['Orders'], 'post', { parameters: [idParameter()] }) },
      '/api/v1/admin/order/{orderId}/refund/{refundId}/status': { patch: protectedOperation('Update refund status', ['Orders'], 'patch', { parameters: [idParameter('orderId'), idParameter('refundId')] }) },
      '/api/v1/reorder': { post: protectedOperation('Reorder a previous order', ['Orders'], 'post') },
      '/api/v1/admin/returns': { get: protectedOperation('List returns', ['Orders'], 'get') },
      '/api/v1/admin/refunds': { get: protectedOperation('List refunds', ['Orders'], 'get') },
      '/api/v1/payment': { post: protectedOperation('Process a payment', ['Payments'], 'post') },
      '/api/v1/stripeapikey': { get: protectedOperation('Get the Stripe publishable key', ['Payments'], 'get') },
      '/api/v1/coupon': { post: protectedOperation('Create a coupon', ['Coupons'], 'post') },
      '/api/v1/coupons/all': { get: { summary: 'List coupons', tags: ['Coupons'], responses: { '200': response() } } },
      '/api/v1/admin/analytics': { get: protectedOperation('Get analytics', ['Analytics'], 'get') },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
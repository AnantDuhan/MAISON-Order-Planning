# Single image that builds the React client and serves it from the Node backend
# (same-origin deployment). The compiled client lives at frontend/build and is
# served by Express when NODE_ENV=production.

FROM node:22-alpine

WORKDIR /app

# Backend dependencies
COPY package*.json ./
RUN npm install

# App source
COPY . .

# Build the frontend. CRA inlines REACT_APP_* at build time, so pass any that
# are needed as build args (see below). Same-origin means the socket/API URLs
# default to the current origin, so these are optional.
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_CASHFREE_MODE
ARG REACT_APP_SOCKET_URL
RUN cd frontend && npm install && npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "backend/server.js"]

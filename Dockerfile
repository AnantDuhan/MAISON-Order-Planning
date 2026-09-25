# Single image that builds the React client and serves it from the Node backend
# (same-origin deployment). Build from the REPOSITORY ROOT:
#   docker build -t maison .
# The compiled client lives at frontend/build and is served by Express when
# NODE_ENV=production.

# ---- Build the frontend ------------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# CRA inlines REACT_APP_* at build time, so pass any that are needed as build
# args. Same-origin means the socket/API URLs default to the current origin.
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_CASHFREE_MODE
ARG REACT_APP_SOCKET_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID \
    REACT_APP_CASHFREE_MODE=$REACT_APP_CASHFREE_MODE \
    REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
RUN npm run build

# ---- Runtime image -----------------------------------------------------------
FROM node:22-alpine
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY --from=frontend /app/frontend/build ./frontend/build

ENV NODE_ENV=production
EXPOSE 8080

USER node
CMD ["node", "backend/server.js"]

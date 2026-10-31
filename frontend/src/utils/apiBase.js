/*
 * Where the browser sends API and socket traffic.
 *
 * In development (`npm run dev` / `npm start`) it is always relative — /api
 * and /socket.io on the Vite dev server — so the proxy in vite.config.mjs
 * decides the backend (localhost:4000, or the live API with dev:remote).
 * A REACT_APP_BACKEND_URL / REACT_APP_SOCKET_URL left in an .env file can't
 * send local development to production.
 *
 * Production builds keep honouring those variables; Netlify normally leaves
 * them unset and forwards /api/* itself (public/_redirects).
 */
const isDev = import.meta.env.DEV;

export const API_BASE_URL = isDev ? '' : import.meta.env.REACT_APP_BACKEND_URL || '';

export const SOCKET_URL = isDev ? undefined : import.meta.env.REACT_APP_SOCKET_URL || undefined;

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend used by the dev server proxy. Defaults to a locally running API
// (cd backend && npm run dev) instead of production.
const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

export default defineConfig({
    plugins: [react()],

    // Keep the existing REACT_APP_* variable names (from .env files or the
    // build environment) so Render/Netlify/Docker settings don't change.
    envPrefix: ['VITE_', 'REACT_APP_'],

    assetsInclude: ['**/*.glb'],

    server: {
        port: 3000,
        proxy: {
            '/api': { target: API_TARGET, changeOrigin: true },
            '/socket.io': { target: API_TARGET, changeOrigin: true, ws: true },
        },
    },

    build: {
        // Same output folder as CRA, so the backend and Docker image are unchanged.
        outDir: 'build',
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
    },
});

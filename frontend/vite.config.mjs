import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api and /socket.io to the DEPLOYED backend by default.
// To use a local backend instead: VITE_API_PROXY_TARGET=http://localhost:8080 npm run dev
const API_TARGET =
    process.env.VITE_API_PROXY_TARGET || 'https://api.maisonorderplanning.in';

// Production cookies are `Secure; SameSite=None`. Rewrite them so the browser
// keeps them on http://localhost — otherwise login works but /me says logged out.
const rewriteCookies = proxy => {
    proxy.on('proxyRes', proxyRes => {
        const cookies = proxyRes.headers['set-cookie'];
        if (!cookies) return;
        proxyRes.headers['set-cookie'] = cookies.map(c =>
            c
                .replace(/;\s*Secure/gi, '')
                .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
                .replace(/;\s*Domain=[^;]+/gi, '')
        );
    });
};

const proxyOptions = {
    target: API_TARGET,
    changeOrigin: true, // sends Host: api.maisonorderplanning.in
    secure: true,
    configure: rewriteCookies,
};

export default defineConfig({
    plugins: [react()],

    envPrefix: ['VITE_', 'REACT_APP_'],

    assetsInclude: ['**/*.glb'],

    server: {
        port: 3000,
        proxy: {
            '/api': proxyOptions,
            '/sitemap.xml': proxyOptions,
            '/socket.io': { ...proxyOptions, ws: true },
        },
    },

    build: {
        outDir: 'build',
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
    },
});
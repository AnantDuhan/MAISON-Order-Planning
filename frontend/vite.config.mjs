import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Where the frontend's /api, /admin, /socket.io and /sitemap.xml requests go.
 *
 *   Production (Netlify build):  same-origin /api/..., forwarded by
 *                                public/_redirects to https://api.maisonorderplanning.in
 *   npm run dev:                 http://localhost:4000 (your local backend)
 *   npm run dev:remote:          https://api.maisonorderplanning.in (no local backend)
 *
 * Override for one run:  VITE_API_PROXY_TARGET=http://localhost:5000 npm run dev
 *
 * The app always calls relative URLs (/api/...), so the session cookie stays
 * first-party on every setup instead of becoming a cross-site cookie.
 */
const LOCAL_API = 'http://localhost:4000';

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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const target = process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || LOCAL_API;

    const proxyOptions = {
        target,
        changeOrigin: true,
        secure: target.startsWith('https://'),
        configure: rewriteCookies,
    };
    const proxy = {
        '/api': proxyOptions,
        '/admin': proxyOptions,
        '/sitemap.xml': proxyOptions,
        '/socket.io': { ...proxyOptions, ws: true },
    };

    if (mode !== 'production') {
        // eslint-disable-next-line no-console
        console.log(`\n  API → ${target}\n`);
    }

    return {
        plugins: [react()],

        envPrefix: ['VITE_', 'REACT_APP_'],

        assetsInclude: ['**/*.glb'],

        server: { port: 3000, proxy },
        // `npm run preview` serves the production build locally; same proxy.
        preview: { port: 4173, proxy },

        build: {
            outDir: 'build',
            sourcemap: false,
            chunkSizeWarningLimit: 1500,
        },
    };
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import netlifySpaRoutes from './netlifySpaRoutes.mjs';

/*
 * Where the frontend's /api, /socket.io and /sitemap.xml requests go.
 *
 *   npm run dev / npm start:     http://localhost:4000 (your local backend)
 *   npm run dev:remote:          https://api.maisonorderplanning.in (no local backend)
 *   npm run preview:             http://localhost:4000, serving the production build
 *   Production (Netlify build):  same-origin /api/..., forwarded by
 *                                public/_redirects to https://api.maisonorderplanning.in
 *
 * .env files can't change this: a VITE_API_PROXY_TARGET, REACT_APP_BACKEND_URL
 * or REACT_APP_SOCKET_URL in them is ignored locally (see src/utils/apiBase.js),
 * so local development never talks to production by accident. For a one-off
 * different backend, set it on the command line:
 *     VITE_API_PROXY_TARGET=http://localhost:5000 npm run dev
 *
 * The app always calls relative URLs (/api/...), so the session cookie stays
 * first-party on every setup instead of becoming a cross-site cookie.
 */
const LOCAL_API = 'http://localhost:4000';
const REMOTE_API = 'https://api.maisonorderplanning.in';

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

// When the local backend isn't running, say so once instead of a stack trace
// per request.
let warnedDown = false;
const explainProxyErrors = target => proxy => {
    proxy.on('error', err => {
        if (err?.code !== 'ECONNREFUSED' || warnedDown) return;
        warnedDown = true;
        // eslint-disable-next-line no-console
        console.warn(`\n  Can't reach the backend at ${target}. Start it with "npm run dev" in backend/,\n  or use "npm run dev:remote" to work against the live API.\n`);
    });
};

export default defineConfig(({ mode, command, isPreview }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // Only an explicit command-line override can move this; .env files can't.
    const target = process.env.VITE_API_PROXY_TARGET || (mode === 'remote' ? REMOTE_API : LOCAL_API);

    // `vite preview` serves a production build, which still honours the
    // REACT_APP_ URLs baked in at build time; only the proxy target is local.
    const ignored = (isPreview ? ['VITE_API_PROXY_TARGET'] : ['VITE_API_PROXY_TARGET', 'REACT_APP_BACKEND_URL', 'REACT_APP_SOCKET_URL'])
        .filter(key => env[key] && !process.env[key]);

    const proxyOptions = {
        target,
        changeOrigin: true,
        secure: target.startsWith('https://'),
        configure: proxy => {
            rewriteCookies(proxy);
            explainProxyErrors(target)(proxy);
        },
    };
    const proxy = {
        '/api': proxyOptions,
        // No '/admin' entry: those are the admin *pages* (React routes). All
        // admin API calls go through /api/v1/admin, and proxying /admin made a
        // refresh or deep link on any admin page return the backend's 404.
        '/sitemap.xml': proxyOptions,
        '/socket.io': { ...proxyOptions, ws: true },
    };

    if (command === 'serve') {
        // eslint-disable-next-line no-console
        console.log(`\n  API → ${target}${mode === 'remote' ? '  (live API)' : ''}`);
        if (ignored.length) {
            // eslint-disable-next-line no-console
            console.log(`  Ignoring ${ignored.join(', ')} from .env files while running locally.`);
        }
        // eslint-disable-next-line no-console
        console.log('');
    }

    return {
        plugins: [react(), netlifySpaRoutes()],

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

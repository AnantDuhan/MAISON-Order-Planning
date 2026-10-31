import fs from 'node:fs';
import path from 'node:path';

const MARKER = '# @spa-routes';

/** Route paths declared as path="..." in App.jsx, in order, without the catch-all. */
export const appRoutes = appSource => {
    const paths = [...appSource.matchAll(/\bpath="([^"]+)"/g)].map(m => m[1]).filter(p => p !== '*');
    return [...new Set(paths)];
};

/** Netlify rewrite lines for those routes (React Router's :param is Netlify's placeholder syntax too). */
export const routeLines = paths => paths.map(p => `${p}  /index.html  200`);

/**
 * Vite plugin: after a build, replaces the "# @spa-routes" line in
 * build/_redirects with one 200 rewrite per App.jsx route. Unknown paths then
 * fall through to the file's final 404 rule, so a typo or a scanner probing
 * /.env gets a real 404 instead of the app with 200.
 * Keeps itself honest: a route written another way (path={...}) is reported.
 */
export default function netlifySpaRoutes({ appFile = 'src/App.jsx' } = {}) {
    let outDir = 'build';
    let root = process.cwd();
    return {
        name: 'netlify-spa-routes',
        apply: 'build',
        configResolved(config) {
            root = config.root;
            outDir = path.resolve(config.root, config.build.outDir);
        },
        closeBundle() {
            const redirectsFile = path.join(outDir, '_redirects');
            if (!fs.existsSync(redirectsFile)) return;
            const source = fs.readFileSync(path.resolve(root, appFile), 'utf8');
            if (/\bpath=\{/.test(source)) {
                this.warn(`${appFile} has a route written as path={...}; only path="..." routes get a 200 rule in _redirects.`);
            }
            const lines = routeLines(appRoutes(source));
            const current = fs.readFileSync(redirectsFile, 'utf8');
            if (!current.includes(MARKER)) {
                this.warn(`_redirects has no "${MARKER}" line; app routes were not added.`);
                return;
            }
            fs.writeFileSync(redirectsFile, current.replace(MARKER, lines.join('\n')));
        },
    };
}

const express = require('express');

const Product = require('../models/product');
const cache = require('../utils/cache');

const router = express.Router();

const SITE_URL = (process.env.SITE_URL || 'https://orderplanning.netlify.app').replace(/\/$/, '');

// Public, indexable pages. Account/checkout/admin pages are excluded here and
// disallowed in robots.txt.
const STATIC_PAGES = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/products', changefreq: 'daily', priority: '0.9' },
    { path: '/about', changefreq: 'monthly', priority: '0.5' },
    { path: '/contact-us', changefreq: 'yearly', priority: '0.4' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
    { path: '/terms', changefreq: 'yearly', priority: '0.2' },
];

const escapeXml = s =>
    String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

const urlEntry = ({ loc, lastmod, changefreq, priority, image }) =>
    [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
        changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
        priority ? `    <priority>${priority}</priority>` : '',
        image ? `    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>` : '',
        '  </url>',
    ]
        .filter(Boolean)
        .join('\n');

/**
 * GET /sitemap.xml — generated from the product catalogue, cached for an hour.
 * Registered before the SPA fallback so it is not swallowed by index.html.
 */
router.get('/sitemap.xml', async (req, res, next) => {
    try {
        let xml = await cache.getJSON('seo:sitemap');

        if (!xml) {
            const products = await Product.find({ isDemo: { $ne: true } })
                .select('_id createdAt images')
                .lean();

            const entries = [
                ...STATIC_PAGES.map(p => urlEntry({ loc: `${SITE_URL}${p.path}`, ...p })),
                ...products.map(p =>
                    urlEntry({
                        loc: `${SITE_URL}/product/${p._id}`,
                        lastmod: p.createdAt,
                        changefreq: 'weekly',
                        priority: '0.8',
                        image: p.images?.[0]?.url,
                    })
                ),
            ];

            xml = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
                ...entries,
                '</urlset>',
            ].join('\n');

            await cache.setJSON('seo:sitemap', xml, 3600);
        }

        res.set('Cache-Control', 'public, max-age=3600');
        res.type('application/xml').send(xml);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

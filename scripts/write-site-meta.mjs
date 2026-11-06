import { writeFileSync } from 'node:fs';

import { loadEnv } from './lib/load-env.mjs';

loadEnv();

const siteUrl = (process.env.NG_APP_SITE_URL || 'https://devchronicle-hugo.web.app').replace(
  /\/+$/,
  '',
);

const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/**
Disallow: /articulos

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/articles</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;

writeFileSync(new URL('../public/robots.txt', import.meta.url), robots);
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap);

console.log(`Wrote robots.txt and sitemap.xml for ${siteUrl}.`);

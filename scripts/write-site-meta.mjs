import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

import { loadEnv } from './lib/load-env.mjs';
import { entryFromMarkdown } from './lib/markdown-entry.mjs';

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
Disallow: /desafios

Sitemap: ${siteUrl}/sitemap.xml
`;

const contentDir = new URL('../public/content/', import.meta.url);
// Cada Markdown publicado de public/content (la fuente de importación) entra al mapa del sitio.
const articleUrls = readdirSync(contentDir)
  .filter((name) => name.endsWith('.md'))
  .sort()
  .map((name) =>
    entryFromMarkdown(name.slice(0, -3), readFileSync(new URL(name, contentDir), 'utf8')),
  )
  .filter(({ entry }) => entry.status === 'published')
  .map(
    ({ entry }) => `  <url>
    <loc>${siteUrl}/post/${entry.slug}</loc>
    <lastmod>${entry.updatedAt.slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
  )
  .join('\n');

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
  <url>
    <loc>${siteUrl}/challenges</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
${articleUrls}
</urlset>
`;

writeFileSync(new URL('../public/robots.txt', import.meta.url), robots);
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap);

console.log(`Wrote robots.txt and sitemap.xml for ${siteUrl}.`);

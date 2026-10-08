import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import compression from 'compression';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(serverDistFolder, '../browser');

if (!process.env['NG_ALLOWED_HOSTS']) {
  process.env['NG_ALLOWED_HOSTS'] = 'localhost:8000,localhost:4200,localhost:3000,localhost,127.0.0.1,wadaqstore.com,*.wadaqstore.com';
}

const app = express();
app.use(compression());
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Dynamic Sitemap Generation
 */
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const siteUrl = process.env['SITE_URL'] || 'https://wadaqstore.com';
    const apiUrl = process.env['API_URL'] || 'http://localhost:4000/api';

    let products: any[] = [];
    let packages: any[] = [];
    let projects: any[] = [];

    try {
      const resp = await fetch(`${apiUrl}/sitemap-data`);
      if (resp.ok) {
        const json = (await resp.json()) as any;
        if (json.success && json.data) {
          products = json.data.products || [];
          packages = json.data.packages || [];
          projects = json.data.projects || [];
        }
      }
    } catch {
      // Backend may be unavailable during static crawl, continue with fallback
    }

    const staticRoutes = ['', '/products', '/packages', '/projects', '/about'];

    let urlsXml = '';
    for (const route of staticRoutes) {
      urlsXml += `
  <url>
    <loc>${siteUrl}/ar${route}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar${route}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en${route}"/>
    <changefreq>daily</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>
  <url>
    <loc>${siteUrl}/en${route}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar${route}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en${route}"/>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    for (const p of products) {
      const arSlug = p.slug?.ar || p.slug;
      const enSlug = p.slug?.en || arSlug;
      const lastmod = p.updatedAt ? `<lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>` : '';
      urlsXml += `
  <url>
    <loc>${siteUrl}/ar/products/${arSlug}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/products/${arSlug}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/products/${enSlug}"/>
    ${lastmod}
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    }

    for (const pkg of packages) {
      const arSlug = pkg.slug?.ar || pkg.slug;
      const enSlug = pkg.slug?.en || arSlug;
      const lastmod = pkg.updatedAt ? `<lastmod>${new Date(pkg.updatedAt).toISOString()}</lastmod>` : '';
      urlsXml += `
  <url>
    <loc>${siteUrl}/ar/packages/${arSlug}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/packages/${arSlug}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/packages/${enSlug}"/>
    ${lastmod}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    for (const proj of projects) {
      const arSlug = proj.slug?.ar || proj.slug;
      const enSlug = proj.slug?.en || arSlug;
      const lastmod = proj.updatedAt ? `<lastmod>${new Date(proj.updatedAt).toISOString()}</lastmod>` : '';
      urlsXml += `
  <url>
    <loc>${siteUrl}/ar/projects/${arSlug}</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${siteUrl}/ar/projects/${arSlug}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${siteUrl}/en/projects/${enSlug}"/>
    ${lastmod}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlsXml}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    res.status(500).send('Error generating sitemap');
  }
});

interface SsrCacheItem {
  html: string;
  status: number;
  expires: number;
}
const ssrPageCache = new Map<string, SsrCacheItem>();
const SSR_CACHE_TTL_MS = 90 * 1000; // 90 seconds cache for public SSR pages

/**
 * Handle all other requests by rendering the Angular application with in-memory caching.
 */
app.use((req, res, next) => {
  const url = req.originalUrl || req.url;
  const isCacheable =
    req.method === 'GET' &&
    !req.headers['authorization'] &&
    !url.startsWith('/admin') &&
    !url.startsWith('/api') &&
    !url.includes('.');

  if (isCacheable) {
    const cached = ssrPageCache.get(url);
    if (cached && Date.now() < cached.expires) {
      res.setHeader('X-SSR-Cache', 'HIT');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(cached.status).send(cached.html);
      return;
    }
  }

  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) {
        next();
        return;
      }

      if (isCacheable && response.status === 200) {
        try {
          const clone = response.clone();
          const html = await clone.text();
          ssrPageCache.set(url, {
            html,
            status: response.status,
            expires: Date.now() + SSR_CACHE_TTL_MS,
          });
          res.setHeader('X-SSR-Cache', 'MISS');
        } catch {
          // Ignore cache clone errors safely
        }
      }

      writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4200.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4200;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express SSR server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

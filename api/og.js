import fs from 'fs';
import path from 'path';

const SITE_URL = process.env.SITE_URL || 'https://wadaq-store.vercel.app';
const API_URL = process.env.API_URL || 'https://wadaq-store-back-end.vercel.app/api';

/**
 * Normalizes text to handle Arabic slug matching
 */
function normalizeSlug(str) {
  if (!str) return '';
  return decodeURIComponent(str)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\w\s\u0621-\u064A\u0660-\u0669-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Finds product from local wadaq-products.json fallback
 */
function findLocalProduct(slug) {
  try {
    const jsonPath = path.join(process.cwd(), 'public/wadaq-products.json');
    if (!fs.existsSync(jsonPath)) return null;
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const products = JSON.parse(raw);
    const decodedSlug = decodeURIComponent(slug).toLowerCase().trim();

    return products.find((p) => {
      if (p.id && p.id.toLowerCase() === decodedSlug) return true;
      if (p.name && normalizeSlug(p.name) === normalizeSlug(decodedSlug)) return true;
      if (p.name && p.name.includes(decodedSlug)) return true;
      return false;
    });
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  const { slug, lang = 'ar', type = 'product' } = req.query;

  if (!slug) {
    return res.redirect(302, `${SITE_URL}/${lang}`);
  }

  let title = 'متجر ودق للتكامل الحسي';
  let description = 'متجر ودق المتخصص في أدوات التكامل الحسي وتجهيز الغرف الحسية للمتخصصين والمراكز';
  let imageUrl = `${SITE_URL}/images/og-preview.png`;
  let priceText = '';

  try {
    // 1. Try remote backend API with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const apiRes = await fetch(`${API_URL}/products/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (apiRes && apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.success && data.data) {
        const p = data.data;
        title = (p.name && (p.name[lang] || p.name.ar || p.name.en)) || title;
        const rawDesc = (p.shortDescription && (p.shortDescription[lang] || p.shortDescription.ar)) ||
          (p.description && (p.description[lang] || p.description.ar)) || '';
        if (p.price) {
          priceText = `السعر: ${p.price} ج.م`;
          description = `${priceText} | ${rawDesc}`.trim();
        } else {
          description = rawDesc || description;
        }

        if (p.images && p.images.length > 0 && p.images[0].url) {
          imageUrl = p.images[0].url;
        }
      }
    } else {
      // 2. Fallback to local catalog
      const local = findLocalProduct(slug);
      if (local) {
        title = local.name || title;
        const rawDesc = local.description || '';
        if (local.price) {
          priceText = `السعر: ${local.price} ج.م`;
          description = `${priceText} | ${rawDesc}`.trim();
        } else {
          description = rawDesc || description;
        }
        if (local.images && local.images.length > 0 && local.images[0].url) {
          imageUrl = local.images[0].url;
        }
      }
    }
  } catch (err) {
    // Safe fallback
  }

  // Ensure absolute URL
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  // Convert .webp to high-compatibility .jpg for WhatsApp crawler
  let imageType = 'image/jpeg';
  if (imageUrl.includes('/images/products/') && imageUrl.endsWith('.webp')) {
    imageUrl = imageUrl.replace(/\.webp$/i, '.jpg');
  } else if (imageUrl.endsWith('.png')) {
    imageType = 'image/png';
  } else if (imageUrl.endsWith('.webp')) {
    imageType = 'image/webp';
  }

  const targetPageUrl = `${SITE_URL}/${lang}/products/${encodeURIComponent(slug)}`;

  // Return full Open Graph meta tags optimized for WhatsApp, Facebook, Twitter, and bots
  const html = `<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} | متجر ودق للتكامل الحسي</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />

    <!-- Open Graph (WhatsApp, Facebook, LinkedIn) -->
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="متجر ودق للتكامل الحسي" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:width" content="800" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:url" content="${targetPageUrl}" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <!-- Instant redirect for real browsers -->
    <meta http-equiv="refresh" content="0; url=${targetPageUrl}" />
    <script>window.location.replace("${targetPageUrl}");</script>
  </head>
  <body style="font-family: system-ui, sans-serif; text-align: center; padding: 2rem;">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <img src="${imageUrl}" alt="${escapeHtml(title)}" style="max-width: 300px; border-radius: 12px; margin: 1rem auto;" />
    <p><a href="${targetPageUrl}">اضغط هنا إذا لم يتم نقلك تلقائياً</a></p>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200');
  return res.status(200).send(html);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

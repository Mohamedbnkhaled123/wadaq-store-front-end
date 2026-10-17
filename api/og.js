const SITE_URL = process.env.SITE_URL || 'https://wadaq-store.vercel.app';
const API_URL = process.env.API_URL || 'https://wadaq-store-back-end.vercel.app/api';

export default async function handler(req, res) {
  const { slug, lang = 'ar', type = 'product' } = req.query;

  if (!slug) {
    return res.redirect(302, `${SITE_URL}/${lang}`);
  }

  let title = 'متجر ودق للتكامل الحسي';
  let description = 'متجر ودق المتخصص في أدوات التكامل الحسي وتجهيز الغرف الحسية للمتخصصين ومراكز التأهيل';
  let imageUrl = `${SITE_URL}/images/og-preview.png`;

  try {
    const endpoint = type === 'package' ? `${API_URL}/packages` : `${API_URL}/products`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const apiRes = await fetch(`${endpoint}/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (apiRes && apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.success && data.data) {
        const item = data.data;
        title = (item.name && (item.name[lang] || item.name.ar || item.name.en)) || title;
        const rawDesc = (item.shortDescription && (item.shortDescription[lang] || item.shortDescription.ar)) ||
          (item.description && (item.description[lang] || item.description.ar)) || '';
        
        if (item.price) {
          description = `السعر: ${item.price.toLocaleString()} ج.م | ${rawDesc}`.trim();
        } else {
          description = rawDesc || description;
        }

        if (item.images && item.images.length > 0 && item.images[0].url) {
          imageUrl = item.images[0].url;
        }
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  // Ensure absolute URL
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    imageUrl = `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  // Convert .webp to high-compatibility .jpg for WhatsApp preview if available
  let imageType = 'image/jpeg';
  if (imageUrl.includes('/images/products/') && imageUrl.endsWith('.webp')) {
    imageUrl = imageUrl.replace(/\.webp$/i, '.jpg');
  } else if (imageUrl.endsWith('.png')) {
    imageType = 'image/png';
  } else if (imageUrl.endsWith('.webp')) {
    imageType = 'image/webp';
  }

  const targetPath = type === 'package' ? 'packages' : 'products';
  const targetPageUrl = `${SITE_URL}/${lang}/${targetPath}/${encodeURIComponent(slug)}`;

  // Open Graph meta tags optimized for WhatsApp, Facebook, Twitter, and search crawlers
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
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
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

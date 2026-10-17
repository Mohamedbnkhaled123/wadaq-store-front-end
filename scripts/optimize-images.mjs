import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Disable internal libvips file cache to prevent EPERM file-locking on Windows during renameSync
sharp.cache(false);

const publicImagesDir = path.resolve('public/images');
const productsDir = path.join(publicImagesDir, 'products');

async function optimizeLogos() {
  const logoPath = path.join(publicImagesDir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    await sharp(logoPath).resize(154, 154, { fit: 'contain' }).webp({ quality: 82 }).toFile(path.join(publicImagesDir, 'logo.webp'));
  }
  const mkLogoPath = path.join(publicImagesDir, 'mk-logo.png');
  if (fs.existsSync(mkLogoPath)) {
    await sharp(mkLogoPath).resize(70, 64, { fit: 'contain' }).webp({ quality: 82 }).toFile(path.join(publicImagesDir, 'mk-logo.webp'));
  }
}

async function optimizeProducts() {
  if (!fs.existsSync(productsDir)) return;
  const files = fs.readdirSync(productsDir).filter((f) => f.endsWith('.webp') || f.endsWith('.png'));
  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const tempPath = path.join(productsDir, `_tmp_${file}.webp`);
    await sharp(filePath).resize(400, 400, { fit: 'cover' }).webp({ quality: 74, effort: 6 }).toFile(tempPath);
    const outPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    fs.renameSync(tempPath, outPath);
  }
}

await optimizeLogos();
await optimizeProducts();

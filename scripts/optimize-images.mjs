import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicImagesDir = path.resolve('public/images');
const productsDir = path.join(publicImagesDir, 'products');

async function optimizeLogos() {
  const logoPath = path.join(publicImagesDir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    const inputBuffer = fs.readFileSync(logoPath);
    await sharp(inputBuffer).resize(154, 154, { fit: 'contain' }).webp({ quality: 82 }).toFile(path.join(publicImagesDir, 'logo.webp'));
  }
  const mkLogoPath = path.join(publicImagesDir, 'mk-logo.png');
  if (fs.existsSync(mkLogoPath)) {
    const inputBuffer = fs.readFileSync(mkLogoPath);
    await sharp(inputBuffer).resize(70, 64, { fit: 'contain' }).webp({ quality: 82 }).toFile(path.join(publicImagesDir, 'mk-logo.webp'));
  }
}

async function optimizeProducts() {
  if (!fs.existsSync(productsDir)) return;
  const files = fs.readdirSync(productsDir).filter((f) => (f.endsWith('.webp') || f.endsWith('.png')) && !f.startsWith('_tmp_'));
  
  // Concurrently process in batches of 4 to maximize CPU parallelism
  const batchSize = 4;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (file) => {
        const filePath = path.join(productsDir, file);
        const tempPath = path.join(productsDir, `_tmp_${file}.webp`);
        const inputBuffer = fs.readFileSync(filePath);
        await sharp(inputBuffer).resize(400, 400, { fit: 'cover' }).webp({ quality: 74, effort: 6 }).toFile(tempPath);
        const outPath = filePath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        if (fs.existsSync(tempPath)) {
          fs.copyFileSync(tempPath, outPath);
          fs.unlinkSync(tempPath);
        }
      })
    );
  }
}

await optimizeLogos();
await optimizeProducts();
console.log('SUCCESS: All images optimized successfully');

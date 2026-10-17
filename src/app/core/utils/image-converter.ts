/**
 * Converts any uploaded image File into an optimized JPEG File.
 * - Handles PNG, WebP, HEIC/JPEG, etc.
 * - Caps maximum dimension to 1600px to ensure fast uploads and great quality.
 * - Outputs high-quality JPEG for maximum WhatsApp and social preview compatibility.
 */
export async function convertToJpg(file: File, maxWidth = 1600, quality = 0.88): Promise<File> {
  // If not in browser or already small JPEG, return safely
  if (typeof window === 'undefined' || !window.document) {
    return file;
  }

  // If it's an SVG and user intends to upload a vector logo, keep SVG untouched
  if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Fill background white so transparent PNGs don't become black
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const convertedFile = new File([blob], newName, { type: 'image/jpeg' });
            resolve(convertedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

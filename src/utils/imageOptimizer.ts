/**
 * Client-Side Image Optimizer
 * Handles high-resolution responsive compression for logos (preserving alpha channel)
 * and banners (optimized for fast web delivery and localStorage).
 */

export interface OptimizeOptions {
  maxDimension?: number;
  quality?: number;
  preserveTransparency?: boolean;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
}

export const optimizeImage = (file: File, options: OptimizeOptions = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please upload an image file (PNG, JPG, WebP, or SVG).'));
      return;
    }

    // Direct read for SVG to keep sharp vector scalability
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const {
      maxDimension = 1200,
      quality = 0.9,
      preserveTransparency = true,
      mimeType = file.type === 'image/png' || preserveTransparency ? 'image/png' : 'image/jpeg',
    } = options;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Handle transparency
        if (!preserveTransparency) {
          ctx.fillStyle = '#0f172a'; // Dark slate fallback
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.clearRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const resultDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(resultDataUrl);
      };

      img.onerror = () => {
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

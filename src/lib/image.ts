/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Resizes the image to fit within maxWidth and maxHeight, maintaining aspect ratio,
 * and converts it to a JPEG data URL at the specified quality.
 */
export function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.HTMLCanvasElement) {
      reject(new Error("Canvas API not available (server-side context)"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions preserving aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            // Fallback to original Base64 if canvas context is not supported
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG with compression quality
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (canvasErr) {
          console.error("Canvas draw/export error:", canvasErr);
          // Fallback to original Base64
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image into Image object"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsDataURL(file);
  });
}

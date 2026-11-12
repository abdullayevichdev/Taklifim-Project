const MAX_IMAGE_BYTES = Math.floor(1.5 * 1024 * 1024);
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Rasmni o‘qib bo‘lmadi'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Siqish muvaffaqiyatsiz'));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compress an image in the browser until it is under 1.5 MB (JPEG).
 */
export async function compressImageForUpload(
  file: File,
  maxBytes = MAX_IMAGE_BYTES
): Promise<{ base64: string; fileType: string; fileName: string; byteSize: number }> {
  if (file.size <= maxBytes && file.type === 'image/jpeg') {
    const base64 = await blobToDataUrl(file);
    return {
      base64,
      fileType: 'image/jpeg',
      fileName: file.name.replace(/\.\w+$/, '.jpg'),
      byteSize: file.size,
    };
  }

  const img = await loadImage(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const maxDim = 2000;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas mavjud emas');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  while (blob.size > maxBytes && (canvas.width > 640 || canvas.height > 640)) {
    canvas.width = Math.round(canvas.width * 0.75);
    canvas.height = Math.round(canvas.height * 0.75);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, 'image/jpeg', Math.max(quality, 0.5));
  }

  if (blob.size > maxBytes) {
    throw new Error(
      'Rasmni 1.5 MB gacha siqib bo‘lmadi. Iltimos, kichikroq rasm tanlang.'
    );
  }

  const base64 = await blobToDataUrl(blob);
  const safeName = file.name.replace(/\.\w+$/, '.jpg') || 'receipt.jpg';
  return {
    base64,
    fileType: 'image/jpeg',
    fileName: safeName,
    byteSize: blob.size,
  };
}

export function validatePdfFile(file: File): string | null {
  if (file.size > MAX_PDF_BYTES) {
    return 'PDF fayl hajmi 4 MB dan oshmasligi kerak. Iltimos, kichikroq fayl yuklang.';
  }
  return null;
}

import { Language } from '../types';
import { translations, uz } from '../locales';

export const TARGET_IMAGE_BYTES = 800 * 1024;
export const MAX_SERVER_IMAGE_BYTES = Math.floor(1.5 * 1024 * 1024);
export const MAX_IMAGE_WIDTH = 1600;
export const DEFAULT_IMAGE_QUALITY = 0.8;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

function getValidationCopy(language: Language = 'uz') {
  return translations[language]?.validation || uz.validation;
}

export function calculateScaledImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth = MAX_IMAGE_WIDTH
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(naturalWidth || 1));
  const safeH = Math.max(1, Math.round(naturalHeight || 1));
  if (safeW <= maxWidth) {
    return { width: safeW, height: safeH };
  }
  const scale = maxWidth / safeW;
  return {
    width: maxWidth,
    height: Math.max(1, Math.round(safeH * scale)),
  };
}

function loadImage(file: File, language: Language = 'uz'): Promise<HTMLImageElement> {
  const v = getValidationCopy(language);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(v.receiptImageLoadFailed));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
  language: Language = 'uz'
): Promise<Blob> {
  const v = getValidationCopy(language);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error(v.receiptCompressFailed));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

export function blobToDataUrl(blob: Blob, language: Language = 'uz'): Promise<string> {
  const v = getValidationCopy(language);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(v.receiptFileReadFailed));
    reader.readAsDataURL(blob);
  });
}

export interface CompressedReceiptImage {
  base64: string;
  fileType: string;
  fileName: string;
  byteSize: number;
  usedFallback?: boolean;
}

export interface CompressImageDeps {
  loadImage?: (file: File, language: Language) => Promise<HTMLImageElement>;
  compressWithCanvas?: (
    img: HTMLImageElement,
    file: File,
    maxBytes: number,
    language: Language
  ) => Promise<CompressedReceiptImage>;
  readOriginalDataUrl?: (file: File, language: Language) => Promise<string>;
}

async function defaultCompressWithCanvas(
  img: HTMLImageElement,
  file: File,
  maxBytes: number,
  language: Language
): Promise<CompressedReceiptImage> {
  const v = getValidationCopy(language);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  // Skip re-encoding if original JPEG/WebP is already <= 1600px wide and under target bytes
  if (
    file.size < maxBytes &&
    naturalW <= MAX_IMAGE_WIDTH &&
    (file.type === 'image/jpeg' || file.type === 'image/webp')
  ) {
    const base64 = await blobToDataUrl(file, language);
    return {
      base64,
      fileType: file.type,
      fileName: file.name || (file.type === 'image/webp' ? 'receipt.webp' : 'receipt.jpg'),
      byteSize: file.size,
    };
  }

  let { width, height } = calculateScaledImageDimensions(naturalW, naturalH, MAX_IMAGE_WIDTH);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(v.receiptCanvasUnavailable);
  ctx.drawImage(img, 0, 0, width, height);

  // Prefer WebP when input is WebP and browser encodes it smaller/valid; otherwise JPEG 0.8
  const targetMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  let quality = DEFAULT_IMAGE_QUALITY;
  let blob = await canvasToBlob(canvas, targetMime, quality, language);
  const activeMime = blob.type === 'image/webp' || blob.type === 'image/jpeg' ? blob.type : 'image/jpeg';

  while (blob.size >= maxBytes && quality > 0.45) {
    quality = Math.max(0.4, Number((quality - 0.1).toFixed(2)));
    blob = await canvasToBlob(canvas, activeMime, quality, language);
  }

  while (blob.size >= maxBytes && (canvas.width > 640 || canvas.height > 640)) {
    width = Math.max(480, Math.round(canvas.width * 0.75));
    height = Math.max(480, Math.round(canvas.height * 0.75));
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    blob = await canvasToBlob(canvas, activeMime, Math.max(quality, 0.5), language);
  }

  if (blob.size > MAX_SERVER_IMAGE_BYTES) {
    throw new Error(v.receiptTooLargeAfterCompress);
  }

  const ext = activeMime === 'image/webp' ? '.webp' : '.jpg';
  const base64 = await blobToDataUrl(blob, language);
  const safeName = file.name.replace(/\.\w+$/, ext) || `receipt${ext}`;
  return {
    base64,
    fileType: activeMime,
    fileName: safeName,
    byteSize: blob.size,
  };
}

/**
 * Compress an image in the browser (max width 1600px, quality 0.8, target < 800 KB).
 * If browser canvas compression fails for any reason, falls back cleanly to sending the original file.
 */
export async function compressImageForUpload(
  file: File,
  maxBytes = TARGET_IMAGE_BYTES,
  language: Language = 'uz',
  deps?: CompressImageDeps
): Promise<CompressedReceiptImage> {
  const readOrig = deps?.readOriginalDataUrl || blobToDataUrl;

  try {
    const imgLoader = deps?.loadImage || loadImage;
    const img = await imgLoader(file, language);
    const runner = deps?.compressWithCanvas || defaultCompressWithCanvas;
    return await runner(img, file, maxBytes, language);
  } catch {
    // Fallback: send original file as-is if compression fails
    const base64 = await readOrig(file, language);
    return {
      base64,
      fileType: file.type || 'image/jpeg',
      fileName: file.name || 'receipt.jpg',
      byteSize: file.size,
      usedFallback: true,
    };
  }
}

export function validatePdfFile(file: File, language: Language = 'uz'): string | null {
  if (file.size > MAX_PDF_BYTES) {
    return getValidationCopy(language).receiptPdfTooLarge;
  }
  return null;
}

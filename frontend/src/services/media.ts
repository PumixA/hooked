const API_URL = import.meta.env.VITE_API_URL || '/api';

function getApiOrigin(): string {
  if (!API_URL.startsWith('http://') && !API_URL.startsWith('https://')) {
    return '';
  }

  try {
    const parsed = new URL(API_URL);
    return parsed.origin;
  } catch {
    return '';
  }
}

export function resolveServerFilePath(filePath?: string): string {
  if (!filePath) return '';

  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:') || filePath.startsWith('blob:')) {
    return filePath;
  }

  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const origin = getApiOrigin();

  return origin ? `${origin}${normalized}` : normalized;
}

export function getProjectVisual(coverBase64?: string, coverFilePath?: string): string {
  if (coverBase64) return coverBase64;
  if (coverFilePath) return resolveServerFilePath(coverFilePath);
  return '/logo.svg';
}

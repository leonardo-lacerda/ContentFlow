import { readFile, unlink } from 'fs/promises';
import { isAbsolute, relative, resolve } from 'path';

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.srt': 'application/x-subrip',
  '.vtt': 'text/vtt',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
};

export async function readCreativeLocalUpload(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const filePath = resolveCreativeLocalUploadPath(url);
  if (!filePath) return null;
  try {
    const buffer = await readFile(filePath);
    if (buffer.length > 512 * 1024 * 1024) throw new Error('Local creative media is too large');
    const extension = `.${filePath.split('.').pop()?.toLowerCase() || ''}`;
    return { buffer, contentType: CONTENT_TYPES[extension] || 'application/octet-stream' };
  } catch {
    return null;
  }
}

export function resolveCreativeLocalUploadPath(url: string): string | null {
  if (process.env.STORAGE_PROVIDER && process.env.STORAGE_PROVIDER !== 'local') return null;
  const uploadDirectory = process.env.UPLOAD_DIRECTORY;
  const frontendUrl = process.env.FRONTEND_URL;
  if (!uploadDirectory || !frontendUrl) return null;
  let parsed: URL;
  let frontend: URL;
  try {
    parsed = new URL(url);
    frontend = new URL(frontendUrl);
  } catch {
    return null;
  }
  if (parsed.origin !== frontend.origin || !parsed.pathname.startsWith('/uploads/')) return null;
  const root = resolve(uploadDirectory);
  let relativeUpload: string;
  try {
    relativeUpload = decodeURIComponent(parsed.pathname.slice('/uploads/'.length));
  } catch {
    return null;
  }
  const filePath = resolve(root, relativeUpload);
  const fileRelative = relative(root, filePath);
  if (!fileRelative || fileRelative.startsWith('..') || isAbsolute(fileRelative)) return null;
  return filePath;
}

export async function deleteCreativeLocalUpload(url: string): Promise<boolean> {
  const filePath = resolveCreativeLocalUploadPath(url);
  if (!filePath) return false;
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

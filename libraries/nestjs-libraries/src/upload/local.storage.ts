import { IUploadProvider } from './upload.interface';
import { mkdirSync, unlink, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
// @ts-ignore
import mime from 'mime';
import { extname } from 'path';
import { isSafePublicHttpsUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer } = require('file-type');

const LOCAL_STORAGE_ALLOWED_MIME = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'video/mp4',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
  'application/x-subrip',
  'text/vtt',
  'text/plain',
  'application/json',
  'application/zip',
]);
const LOCAL_STORAGE_TEXT_EXTENSIONS: Record<string, string> = {
  'application/x-subrip': 'srt',
  'text/vtt': 'vtt',
  'text/plain': 'txt',
  'application/json': 'json',
  'application/zip': 'zip',
};
export class LocalStorage implements IUploadProvider {
  constructor(private uploadDirectory: string) {}

  async uploadSimple(path: string) {
    if (!(await isSafePublicHttpsUrl(path))) {
      throw new Error('Unsafe URL');
    }
    const loadImage = await fetch(path, {
      // @ts-ignore — undici option, not in lib.dom fetch types
      dispatcher: ssrfSafeDispatcher,
    });
    const contentType =
      loadImage?.headers?.get('content-type') ||
      loadImage?.headers?.get('Content-Type');
    const findExtension = mime.getExtension(contentType) ||
      path.split('?')[0].split('#')[0].split('.').pop() ||
      'bin';

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const innerPath = `/${year}/${month}/${day}`;
    const dir = `${this.uploadDirectory}${innerPath}`;
    mkdirSync(dir, { recursive: true });

    const randomName = randomBytes(16).toString('hex');

    const filePath = `${dir}/${randomName}.${findExtension}`;
    const publicPath = `${innerPath}/${randomName}.${findExtension}`;
    // Logic to save the file to the filesystem goes here
    writeFileSync(filePath, Buffer.from(await loadImage.arrayBuffer()));

    return process.env.FRONTEND_URL + '/uploads' + publicPath;
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const detected = await fromBuffer(file.buffer);
      if (!detected && !LOCAL_STORAGE_TEXT_EXTENSIONS[file.mimetype]) {
        throw new Error('Unsupported file type.');
      }
      if (detected && !LOCAL_STORAGE_ALLOWED_MIME.has(detected.mime) && !LOCAL_STORAGE_TEXT_EXTENSIONS[file.mimetype]) {
        throw new Error('Unsupported file type.');
      }
      const safeExt = `.${detected?.ext || LOCAL_STORAGE_TEXT_EXTENSIONS[file.mimetype]}`;
      const safeMime = detected?.mime || file.mimetype;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const innerPath = `/${year}/${month}/${day}`;
      const dir = `${this.uploadDirectory}${innerPath}`;
      mkdirSync(dir, { recursive: true });

      const randomName = randomBytes(16).toString('hex');

      const filePath = `${dir}/${randomName}${safeExt}`;
      const publicPath = `${innerPath}/${randomName}${safeExt}`;

      writeFileSync(filePath, file.buffer);

      return {
        filename: `${randomName}${safeExt}`,
        path: process.env.FRONTEND_URL + '/uploads' + publicPath,
        mimetype: safeMime,
        originalname: `${randomName}${safeExt}`,
      };
    } catch (err) {
      console.error('Error uploading file to Local Storage:', err);
      throw err;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    // Logic to remove the file from the filesystem goes here
    return new Promise((resolve, reject) => {
      unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { deleteCreativeLocalUpload, readCreativeLocalUpload } from './creative-local-media';

describe('readCreativeLocalUpload', () => {
  const previous = {
    storage: process.env.STORAGE_PROVIDER,
    frontend: process.env.FRONTEND_URL,
    upload: process.env.UPLOAD_DIRECTORY,
  };

  afterEach(() => {
    if (previous.storage === undefined) delete process.env.STORAGE_PROVIDER;
    else process.env.STORAGE_PROVIDER = previous.storage;
    if (previous.frontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previous.frontend;
    if (previous.upload === undefined) delete process.env.UPLOAD_DIRECTORY;
    else process.env.UPLOAD_DIRECTORY = previous.upload;
  });

  it('reads only a file below the configured local upload root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'creative-local-media-test-'));
    try {
      const folder = join(root, '2026', '08', '08');
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, 'captions.srt'), '1\n00:00:00,000 --> 00:00:01,000\nHook\n');
      process.env.STORAGE_PROVIDER = 'local';
      process.env.FRONTEND_URL = 'http://localhost:4200';
      process.env.UPLOAD_DIRECTORY = root;

      const result = await readCreativeLocalUpload('http://localhost:4200/uploads/2026/08/08/captions.srt');
      expect(result?.contentType).toBe('application/x-subrip');
      expect(result?.buffer.toString()).toContain('Hook');
      await expect(readCreativeLocalUpload('http://evil.example/uploads/2026/08/08/captions.srt')).resolves.toBeNull();
      await expect(readCreativeLocalUpload('http://localhost:4200/uploads/../../secret')).resolves.toBeNull();
      await expect(deleteCreativeLocalUpload('http://localhost:4200/uploads/2026/08/08/captions.srt')).resolves.toBe(true);
      await expect(readCreativeLocalUpload('http://localhost:4200/uploads/2026/08/08/captions.srt')).resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

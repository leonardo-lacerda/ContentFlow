import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { unzipSync } from 'fflate';
import { CreativeExportService } from './creative-export.service';
import { resolveCreativeLocalUploadPath } from './creative-local-media';

describe('CreativeExportService', () => {
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

  it('includes media stored in ContentFlow local uploads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'creative-export-test-'));
    try {
      const sourceDirectory = join(root, '2026', '08', '09');
      await mkdir(sourceDirectory, { recursive: true });
      const captionsPath = join(sourceDirectory, 'captions.srt');
      await writeFile(captionsPath, '1\n00:00:00,000 --> 00:00:01,000\nHook\n');

      process.env.STORAGE_PROVIDER = 'local';
      process.env.FRONTEND_URL = 'http://localhost:4200';
      process.env.UPLOAD_DIRECTORY = root;

      const projectId = 'project-export-1';
      const organizationId = 'organization-export-1';
      const captionsUrl = 'http://localhost:4200/uploads/2026/08/09/captions.srt';
      const prisma = {
        creativeProject: {
          findFirst: jest.fn().mockResolvedValue({
            id: projectId,
            organizationId,
            name: 'Export test',
            assets: [],
            products: [],
            actors: [],
            scripts: [],
            variants: [{ id: 'variant-1', videoUrl: null, thumbnailUrl: null, captionsUrl }],
            publications: [],
            jobs: [],
            reviews: [],
            provenance: [],
          }),
        },
        creativeVoice: { findMany: jest.fn().mockResolvedValue([]) },
        creativeRightsGrant: { findMany: jest.fn().mockResolvedValue([]) },
      } as any;

      const result = await new CreativeExportService(prisma).exportProject(organizationId, projectId);

      expect(result.skippedMedia).toEqual([]);
      expect(result.fileCount).toBe(3);
      expect(result.url).toContain('/uploads/');
      const archivePath = resolveCreativeLocalUploadPath(result.url);
      expect(archivePath).not.toBeNull();
      const exportedFiles = unzipSync(await readFile(archivePath!));
      const captionFile = Object.entries(exportedFiles).find(([name]) => name.startsWith('media/'))?.[1];
      expect(Buffer.from(captionFile || []).toString('utf8')).toContain('Hook');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

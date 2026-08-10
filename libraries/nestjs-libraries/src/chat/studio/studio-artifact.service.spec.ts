import { BadRequestException } from '@nestjs/common';
import { StudioArtifactService } from './studio-artifact.service';

describe('StudioArtifactService', () => {
  function makePrisma() {
    const tx = {
      studioArtifact: {
        create: jest.fn().mockResolvedValue({
          id: 'artifact-1',
          organizationId: 'org-1',
          type: 'IDEA',
          title: 'Hook',
          content: { hook: 'A' },
          currentVersion: 1,
        }),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'artifact-1', currentVersion: 2 }),
      },
      studioArtifactVersion: {
        create: jest.fn().mockResolvedValue({ id: 'version-1', version: 1 }),
      },
      studioArtifactEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
      studioAttachment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'attachment-1', status: 'READY' }),
      },
    };
    return {
      tx,
      prisma: {
        $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
        studioArtifact: tx.studioArtifact,
        studioArtifactVersion: tx.studioArtifactVersion,
        studioArtifactEvent: tx.studioArtifactEvent,
        studioAttachment: tx.studioAttachment,
      } as any,
    };
  }

  it('creates the artifact, version 1 and audit event in one transaction', async () => {
    const { prisma, tx } = makePrisma();
    const service = new StudioArtifactService(prisma);

    await service.create('org-1', {
      threadId: 'thread-1',
      type: 'idea',
      title: '  Hook  ',
      content: { hook: 'A' },
      source: 'chat',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.studioArtifact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          type: 'IDEA',
          title: 'Hook',
        }),
      })
    );
    expect(tx.studioArtifactVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) })
    );
    expect(tx.studioArtifactEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: 'created' }) })
    );
  });

  it('increments the version and keeps the organization boundary', async () => {
    const { prisma, tx } = makePrisma();
    tx.studioArtifact.findFirst.mockResolvedValue({
      id: 'artifact-1',
      organizationId: 'org-1',
      currentVersion: 1,
    });
    const service = new StudioArtifactService(prisma);

    await service.createVersion('artifact-1', 'org-1', {
      content: { hook: 'B' },
      changeSummary: 'Refined hook',
    });

    expect(tx.studioArtifact.findFirst).toHaveBeenCalledWith({
      where: { id: 'artifact-1', organizationId: 'org-1' },
    });
    expect(tx.studioArtifact.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentVersion: 2 }) })
    );
    expect(tx.studioArtifactVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 2 }) })
    );
  });

  it('rejects unsafe attachment URLs', async () => {
    const { prisma } = makePrisma();
    const service = new StudioArtifactService(prisma);

    await expect(
      service.addAttachment('org-1', {
        filename: 'reference.pdf',
        storageUrl: 'http://external.example/reference.pdf',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.studioAttachment.create).not.toHaveBeenCalled();
  });

  it('updates processed attachment metadata only inside its organization', async () => {
    const { prisma } = makePrisma();
    prisma.studioAttachment.findFirst.mockResolvedValue({
      id: 'attachment-1',
      organizationId: 'org-1',
      deletedAt: null,
    });
    const service = new StudioArtifactService(prisma);

    await service.updateAttachment('attachment-1', 'org-1', {
      status: 'READY',
      metadata: { extractedText: 'safe preview' },
    });

    expect(prisma.studioAttachment.findFirst).toHaveBeenCalledWith({
      where: { id: 'attachment-1', organizationId: 'org-1', deletedAt: null },
    });
    expect(prisma.studioAttachment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'attachment-1' },
        data: expect.objectContaining({ status: 'READY' }),
      })
    );
  });
});

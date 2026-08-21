import {
  MediaRepository,
  parseCarouselProjectMetadata,
  serializeCarouselProjectMetadata,
  CAROUSEL_PROJECT_METADATA_PREFIX,
} from './media.repository';

describe('parseCarouselProjectMetadata / serializeCarouselProjectMetadata (round trip)', () => {
  it('round-trips a metadata object with no free-text alt', () => {
    const alt = serializeCarouselProjectMetadata({ plan: { title: 'X' } });
    const parsed = parseCarouselProjectMetadata(alt);
    expect(parsed.projectMetadata).toEqual({ plan: { title: 'X' } });
    expect(parsed.alt).toBeNull();
  });

  it('round-trips a metadata object alongside the slide\'s own free-text alt', () => {
    const alt = serializeCarouselProjectMetadata({ logo: { mediaId: 'm1' } }, 'Slide 1 accessible description');
    const parsed = parseCarouselProjectMetadata(alt);
    expect(parsed.projectMetadata).toEqual({ logo: { mediaId: 'm1' } });
    expect(parsed.alt).toBe('Slide 1 accessible description');
  });

  it('returns no metadata for an ordinary (non-prefixed) alt string', () => {
    const parsed = parseCarouselProjectMetadata('just a normal alt text');
    expect(parsed.projectMetadata).toBeNull();
    expect(parsed.alt).toBe('just a normal alt text');
  });

  it('returns null metadata and null alt for an empty/undefined alt', () => {
    expect(parseCarouselProjectMetadata(undefined)).toEqual({ alt: undefined, projectMetadata: null });
    expect(parseCarouselProjectMetadata(null)).toEqual({ alt: null, projectMetadata: null });
  });

  it('falls back to the raw string when the prefixed payload is not valid JSON', () => {
    const parsed = parseCarouselProjectMetadata(`${CAROUSEL_PROJECT_METADATA_PREFIX}not json`);
    expect(parsed.projectMetadata).toBe('not json');
  });
});

// Regression test for the 2026-08-20 audit finding: getMediaById used to do
// findUnique({ where: { id } }) with no organization filter, unlike every
// other method in this file — so a post referencing another org's Media.id
// (with no path) would resolve that foreign row's real path/URL back into
// the response, leaking cross-tenant asset locations.
describe('MediaRepository.getMediaById organization scoping', () => {
  it('scopes the Prisma query by organizationId alongside id', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const media = { model: { media: { findUnique } } };
    const repository = new MediaRepository(media as any);

    await repository.getMediaById('org-1', 'media-1');

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'media-1', organizationId: 'org-1' },
    });
  });

  it('returns null (not another org\'s row) when the media belongs to a different org', async () => {
    // Prisma itself enforces the where clause; this asserts the repository
    // passes the org through rather than silently dropping it.
    const findUnique = jest.fn().mockImplementation(({ where }) =>
      Promise.resolve(
        where.organizationId === 'org-owner'
          ? { id: where.id, organizationId: 'org-owner', path: '/uploads/secret.png' }
          : null
      )
    );
    const media = { model: { media: { findUnique } } };
    const repository = new MediaRepository(media as any);

    const asAttacker = await repository.getMediaById('org-attacker', 'media-1');
    expect(asAttacker).toBeNull();

    const asOwner = await repository.getMediaById('org-owner', 'media-1');
    expect(asOwner).not.toBeNull();
  });
});

describe('MediaRepository.setCarouselLogo', () => {
  const buildRepository = (rows: Array<{ id: string; name: string; alt: string | null }>) => {
    const findMany = jest.fn().mockResolvedValue(rows.map((r) => ({ ...r, path: 'p', originalName: 'Carrossel: X', createdAt: new Date() })));
    const update = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ignored', ...data }));
    const media = { model: { media: { findMany, update } } };
    const repository = new MediaRepository(media as any);
    return { repository, findMany, update };
  };

  it('writes the logo onto the row carrying existing project metadata, preserving the rest of it', async () => {
    const carrierAlt = serializeCarouselProjectMetadata({ plan: { title: 'Meu Carrossel' } });
    const { repository, update } = buildRepository([
      { id: 'slide-2', name: 'carousel-slide-02', alt: null },
      { id: 'slide-1', name: 'carousel-slide-01', alt: carrierAlt },
    ]);

    await repository.setCarouselLogo('org-1', ['slide-1', 'slide-2'], {
      mediaId: 'logo-media-1',
      url: 'https://cdn/logo.png',
      position: 'top-right',
      widthPct: 18,
      opacity: 1,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'slide-1', organizationId: 'org-1' } })
    );
    const writtenAlt = update.mock.calls[0][0].data.alt as string;
    const parsed = parseCarouselProjectMetadata(writtenAlt);
    expect((parsed.projectMetadata as any).plan).toEqual({ title: 'Meu Carrossel' });
    expect((parsed.projectMetadata as any).logo).toEqual({
      mediaId: 'logo-media-1',
      url: 'https://cdn/logo.png',
      position: 'top-right',
      widthPct: 18,
      opacity: 1,
    });
  });

  it('falls back to the alphabetically-first slide when no row carries project metadata yet (Studio-origin carousels)', async () => {
    const { repository, update } = buildRepository([
      { id: 'slide-2', name: 'carousel-slide-02', alt: null },
      { id: 'slide-1', name: 'carousel-slide-01', alt: null },
    ]);

    await repository.setCarouselLogo('org-1', ['slide-1', 'slide-2'], {
      mediaId: 'logo-1',
      url: 'u',
      position: 'center',
      widthPct: 20,
      opacity: 1,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'slide-1', organizationId: 'org-1' } })
    );
  });

  it('removes the logo key while leaving other metadata intact when passed null', async () => {
    const carrierAlt = serializeCarouselProjectMetadata({ plan: { title: 'X' }, logo: { mediaId: 'old' } });
    const { repository, update } = buildRepository([
      { id: 'slide-1', name: 'carousel-slide-01', alt: carrierAlt },
    ]);

    await repository.setCarouselLogo('org-1', ['slide-1'], null);

    const writtenAlt = update.mock.calls[0][0].data.alt as string;
    const parsed = parseCarouselProjectMetadata(writtenAlt);
    expect(parsed.projectMetadata).toEqual({ plan: { title: 'X' } });
  });

  it('preserves the carrier row\'s own free-text alt suffix across an update', async () => {
    const carrierAlt = serializeCarouselProjectMetadata({ plan: { title: 'X' } }, 'Accessible description');
    const { repository, update } = buildRepository([
      { id: 'slide-1', name: 'carousel-slide-01', alt: carrierAlt },
    ]);

    await repository.setCarouselLogo('org-1', ['slide-1'], {
      mediaId: 'logo-1',
      url: 'u',
      position: 'center',
      widthPct: 20,
      opacity: 1,
    });

    const writtenAlt = update.mock.calls[0][0].data.alt as string;
    expect(parseCarouselProjectMetadata(writtenAlt).alt).toBe('Accessible description');
  });

  it('returns null and never calls update when none of the ids belong to the organization', async () => {
    const { repository, update } = buildRepository([]);
    const result = await repository.setCarouselLogo('org-1', ['not-mine'], {
      mediaId: 'logo-1',
      url: 'u',
      position: 'center',
      widthPct: 20,
      opacity: 1,
    });
    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});

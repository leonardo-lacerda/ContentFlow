import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';

export const CAROUSEL_PROJECT_METADATA_PREFIX =
  '__CONTENTFLOW_CAROUSEL_PROJECT__:';

export function parseCarouselProjectMetadata(alt?: string | null) {
  if (!alt?.startsWith(CAROUSEL_PROJECT_METADATA_PREFIX)) {
    return { alt, projectMetadata: null };
  }

  const rest = alt.slice(CAROUSEL_PROJECT_METADATA_PREFIX.length);
  const [rawMetadata, ...altParts] = rest.split('\n\n');
  let projectMetadata: unknown = null;

  try {
    projectMetadata = JSON.parse(rawMetadata);
  } catch (error) {
    projectMetadata = rawMetadata;
  }

  return {
    alt: altParts.join('\n\n').trim() || null,
    projectMetadata,
  };
}

/**
 * Inverse of parseCarouselProjectMetadata: re-serializes a (possibly updated)
 * metadata object plus the slide's own free-text alt back into the single
 * alt string stored on the row. `metadata` must be a plain object - only
 * parseCarouselProjectMetadata's success path (JSON.parse) produces one; its
 * catch path can yield a bare string for pre-existing rows saved before this
 * convention was JSON, which callers should treat as unmergeable and replace
 * rather than pass here.
 */
export function serializeCarouselProjectMetadata(
  metadata: Record<string, unknown>,
  ownAlt?: string | null
): string {
  const prefixed = `${CAROUSEL_PROJECT_METADATA_PREFIX}${JSON.stringify(metadata)}`;
  return ownAlt ? `${prefixed}\n\n${ownAlt}` : prefixed;
}

@Injectable()
export class MediaRepository {
  constructor(private _media: PrismaRepository<'media'>) {}

  saveFile(org: string, fileName: string, filePath: string, originalName?: string) {
    return this._media.model.media.create({
      data: {
        organization: {
          connect: {
            id: org,
          },
        },
        name: fileName,
        path: filePath,
        originalName: originalName || null,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
      },
    });
  }

  getMediaById(org: string, id: string) {
    return this._media.model.media.findUnique({
      where: {
        id,
        organizationId: org,
      },
    });
  }

  deleteMedia(org: string, id: string) {
    return this._media.model.media.update({
      where: {
        id,
        organizationId: org,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._media.model.media.update({
      where: {
        id: data.id,
        organizationId: org,
      },
      data: {
        alt: data.alt,
        thumbnail: data.thumbnail,
        thumbnailTimestamp: data.thumbnailTimestamp,
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        alt: true,
        thumbnail: true,
        path: true,
        thumbnailTimestamp: true,
      },
    });
  }

  async getMedia(org: string, page: number, search?: string) {
    const pageNum = (page || 1) - 1;
    const trimmedSearch = search?.trim();
    const searchFilter = trimmedSearch
      ? {
          originalName: {
            contains: trimmedSearch,
            mode: 'insensitive' as const,
          },
        }
      : {};
    const media = await this._media.model.media.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        ...searchFilter,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        thumbnail: true,
        alt: true,
        thumbnailTimestamp: true,
        createdAt: true,
      },
    });

    const grouped = new Map<string, any[]>();
    const results: any[] = media.flatMap((item) => {
      if (!item.originalName?.startsWith('Carrossel: ')) {
        return [item];
      }

      const items = grouped.get(item.originalName) || [];
      items.push(item);
      grouped.set(item.originalName, items);
      return [];
    });

    grouped.forEach((items, originalName) => {
      const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));
      const projectSource = sortedItems.find((item) =>
        item.alt?.startsWith(CAROUSEL_PROJECT_METADATA_PREFIX)
      );
      const parsedProject = parseCarouselProjectMetadata(projectSource?.alt);
      const children = sortedItems.map((item) => {
        const parsed = parseCarouselProjectMetadata(item.alt);
        return {
          ...item,
          alt: parsed.alt,
        };
      });

      results.push({
        ...children[0],
        id: `carousel:${children.map((item) => item.id).join(':')}`,
        originalName,
        isCarousel: true,
        carouselProject: parsedProject.projectMetadata,
        children,
      });
    });

    results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      pages: Math.ceil(results.length / 18),
      results: results.slice(pageNum * 18, pageNum * 18 + 18),
    };
  }

  /**
   * Resolves and validates a carousel group by its child Media ids (the ids
   * embedded in the synthetic `carousel:<id1>:<id2>:...` id `getMedia`
   * produces). Scoped to `org` and non-deleted so a group can never be read
   * or written by/for another organization, and silently drops any id that
   * doesn't belong to this org rather than throwing - the caller decides
   * whether a partial/empty result is acceptable.
   */
  async getCarouselGroup(org: string, childIds: string[]) {
    const rows = await this._media.model.media.findMany({
      where: { id: { in: childIds }, organizationId: org, deletedAt: null },
      select: {
        id: true,
        name: true,
        originalName: true,
        path: true,
        alt: true,
        createdAt: true,
      },
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Sets or clears the carousel-level logo config, persisted the same way
   * projectMetadata already is: JSON embedded in the metadata-carrying
   * slide's `alt` field (see parseCarouselProjectMetadata /
   * serializeCarouselProjectMetadata above), under a `logo` key alongside
   * whatever project metadata was already there. Never touches the other
   * slides' rows, and preserves the metadata-carrying slide's own free-text
   * alt suffix if it had one.
   */
  async setCarouselLogo(
    org: string,
    childIds: string[],
    logo: Record<string, unknown> | null
  ) {
    const group = await this.getCarouselGroup(org, childIds);
    if (!group.length) return null;
    const carrier =
      group.find((item) => item.alt?.startsWith(CAROUSEL_PROJECT_METADATA_PREFIX)) ||
      group[0];
    const parsed = parseCarouselProjectMetadata(carrier.alt);
    const existingMetadata =
      parsed.projectMetadata && typeof parsed.projectMetadata === 'object'
        ? (parsed.projectMetadata as Record<string, unknown>)
        : {};
    const nextMetadata = { ...existingMetadata };
    if (logo) nextMetadata.logo = logo;
    else delete nextMetadata.logo;

    const alt = serializeCarouselProjectMetadata(nextMetadata, parsed.alt);
    return this.saveMediaInformation(org, { id: carrier.id, alt });
  }
}

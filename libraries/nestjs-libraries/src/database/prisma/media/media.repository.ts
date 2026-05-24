import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';

const CAROUSEL_PROJECT_METADATA_PREFIX =
  '__CONTENTFLOW_CAROUSEL_PROJECT__:';

function parseCarouselProjectMetadata(alt?: string | null) {
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

  getMediaById(id: string) {
    return this._media.model.media.findUnique({
      where: {
        id,
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
}

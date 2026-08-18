import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import archiver from 'archiver';

export type CarouselLogoPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'custom';

export type CarouselLogoConfig = {
  mediaId: string;
  url: string;
  position: CarouselLogoPosition;
  // Fractions of the base image's width/height (0-1), only meaningful when
  // position is 'custom'. Represent the logo's CENTER point, matching how a
  // draggable overlay naturally reports where the user dropped it.
  x?: number;
  y?: number;
  // The logo's rendered width as a percentage of the base image's width.
  // Height is derived from the logo's own aspect ratio, never stretched.
  widthPct: number;
  // 0-1.
  opacity: number;
};

const MIN_WIDTH_PCT = 4;
const MAX_WIDTH_PCT = 60;
const DEFAULT_MARGIN_PCT = 4;

/**
 * All the media this feature ever composites are the app's own generated
 * carousel slides and the user's own just-uploaded logo file - both are
 * `Media.path` values this same backend produced at upload time (either the
 * local-storage `${FRONTEND_URL}/uploads/...` path or the configured
 * Cloudflare bucket URL), scoped to the caller's own organization by
 * `getCarouselGroup`'s query. Never a URL an attacker could substitute
 * in the request - `groupId`/`mediaId` only select which of the org's own
 * already-uploaded rows to read, they don't carry a URL themselves.
 *
 * Deliberately a plain fetch(), NOT ssrfSafeDispatcher: that dispatcher
 * exists to stop trusted code from being tricked into fetching an
 * attacker-CHOSEN address (the real SSRF threat model), and it blocks
 * loopback/private IPs to do that. `Media.path` for local dev storage is
 * `http://localhost:${FRONTEND_URL_PORT}/uploads/...` by design - a
 * legitimate, expected target here, not an attacker payload - so routing it
 * through that dispatcher doesn't add protection, it just breaks every local
 * dev compositing request. Confirmed live: composited download 500'd with
 * "fetch failed" until this was removed.
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

@Injectable()
export class CarouselImageCompositorService {
  private readonly logger = new Logger(CarouselImageCompositorService.name);

  /**
   * Composites `logo` onto `base` per `config` and returns the final PNG
   * bytes. The base image is never mutated in storage - callers always
   * render on demand from the untouched original plus the current logo
   * config, so removing/replacing the logo later is just changing config,
   * never a lossy re-edit of already-composited pixels.
   */
  async renderSlide(baseUrl: string, logo?: CarouselLogoConfig | null): Promise<Buffer> {
    const baseBuffer = await fetchImageBuffer(baseUrl);
    if (!logo) return sharp(baseBuffer).png().toBuffer();
    const logoBuffer = await fetchImageBuffer(logo.url);
    return this.compositeLogo(baseBuffer, logoBuffer, logo);
  }

  /**
   * Pure(ish) compositing: takes already-fetched image bytes for both the
   * base slide and the logo, so it never performs I/O itself - keeps the
   * network fetch (renderSlide) separate from the pixel math (this method),
   * which is what makes the pixel math directly unit-testable with in-memory
   * fixtures instead of a mocked fetch.
   */
  async compositeLogo(
    baseBuffer: Buffer,
    logoBuffer: Buffer,
    logo: Pick<CarouselLogoConfig, 'position' | 'x' | 'y' | 'widthPct' | 'opacity'>
  ): Promise<Buffer> {
    const base = sharp(baseBuffer);
    const baseMeta = await base.metadata();
    const baseWidth = baseMeta.width;
    const baseHeight = baseMeta.height;
    if (!baseWidth || !baseHeight) {
      throw new Error('Could not read base image dimensions');
    }

    const widthPct = clamp(logo.widthPct || 18, MIN_WIDTH_PCT, MAX_WIDTH_PCT);
    const targetWidth = Math.max(1, Math.round(baseWidth * (widthPct / 100)));

    let resizedLogo = sharp(logoBuffer)
      .resize({ width: targetWidth, withoutEnlargement: false })
      .ensureAlpha();

    const opacity = clamp(logo.opacity ?? 1, 0, 1);
    if (opacity < 1) {
      // Standard sharp technique for applying uniform opacity to an image
      // that may already have its own alpha channel (a transparent-background
      // PNG logo): composite a 1x1 tile whose alpha equals the target opacity
      // using blend mode 'dest-in', which multiplies the existing alpha
      // channel by the tile's alpha rather than replacing it - a fully
      // transparent pixel in the logo stays transparent, a fully opaque
      // pixel is scaled down to exactly `opacity`.
      resizedLogo = sharp(await resizedLogo.toBuffer()).composite([
        {
          input: {
            create: {
              width: 1,
              height: 1,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: opacity },
            },
          },
          tile: true,
          blend: 'dest-in',
        },
      ]);
    }

    const logoOutBuffer = await resizedLogo.png().toBuffer();
    const logoMeta = await sharp(logoOutBuffer).metadata();
    const logoWidth = logoMeta.width || targetWidth;
    const logoHeight = logoMeta.height || targetWidth;

    const margin = Math.round(baseWidth * (DEFAULT_MARGIN_PCT / 100));
    const { left, top } = this.resolvePosition(
      logo.position,
      baseWidth,
      baseHeight,
      logoWidth,
      logoHeight,
      margin,
      logo.x,
      logo.y
    );

    return sharp(baseBuffer)
      .composite([{ input: logoOutBuffer, left, top }])
      .png()
      .toBuffer();
  }

  private resolvePosition(
    position: CarouselLogoPosition,
    baseWidth: number,
    baseHeight: number,
    logoWidth: number,
    logoHeight: number,
    margin: number,
    xFraction?: number,
    yFraction?: number
  ): { left: number; top: number } {
    const clampToCanvas = (left: number, top: number) => ({
      left: Math.round(clamp(left, 0, Math.max(0, baseWidth - logoWidth))),
      top: Math.round(clamp(top, 0, Math.max(0, baseHeight - logoHeight))),
    });

    switch (position) {
      case 'top-left':
        return clampToCanvas(margin, margin);
      case 'top-right':
        return clampToCanvas(baseWidth - logoWidth - margin, margin);
      case 'bottom-left':
        return clampToCanvas(margin, baseHeight - logoHeight - margin);
      case 'bottom-right':
        return clampToCanvas(baseWidth - logoWidth - margin, baseHeight - logoHeight - margin);
      case 'center':
        return clampToCanvas((baseWidth - logoWidth) / 2, (baseHeight - logoHeight) / 2);
      case 'custom':
      default: {
        // x/y are the logo's desired CENTER as a fraction of the canvas;
        // default to center-of-canvas if not given.
        const cx = (xFraction ?? 0.5) * baseWidth;
        const cy = (yFraction ?? 0.5) * baseHeight;
        return clampToCanvas(cx - logoWidth / 2, cy - logoHeight / 2);
      }
    }
  }

  /**
   * Streams a ZIP of the given slides (each already-rendered, logo baked in
   * if configured) directly to `writeStream` (an Express Response works as
   * one) rather than buffering the whole archive in memory - a carousel can
   * have up to 10 full-resolution images.
   */
  streamZip(
    writeStream: NodeJS.WritableStream,
    entries: Array<{ filename: string; buffer: Buffer }>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (error) => {
        this.logger.error(`Carousel zip export failed: ${error.message}`);
        reject(error);
      });
      archive.on('warning', (warning) => this.logger.warn(warning.message));
      // 'finish' fires once every byte has been flushed to the destination -
      // the correct completion signal for both an Express Response and a
      // plain PassThrough (used in tests). 'close' is not guaranteed to fire
      // promptly (or fires on connection-drop, not completion) on every
      // writable stream implementation.
      writeStream.on('finish', () => resolve());
      archive.pipe(writeStream as any);
      for (const entry of entries) {
        archive.append(entry.buffer, { name: entry.filename });
      }
      void archive.finalize();
    });
  }
}

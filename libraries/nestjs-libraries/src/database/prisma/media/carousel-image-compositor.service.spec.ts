import sharp from 'sharp';
import { CarouselImageCompositorService } from './carousel-image-compositor.service';

// Uses real sharp (already a hard dependency, deterministic, fast on the tiny
// fixtures below) rather than mocking it - a mock would only prove we called
// sharp's API the way we think it works, not that the actual composited
// pixels land where the config says they should. These tests generate real
// in-memory PNGs and assert on the real output.

const solidPng = async (width: number, height: number, rgba: [number, number, number, number]) =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] },
    },
  })
    .png()
    .toBuffer();

const pixelAt = async (buffer: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const offset = (y * info.width + x) * info.channels;
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
    a: data[offset + 3],
  };
};

describe('CarouselImageCompositorService.compositeLogo', () => {
  let service: CarouselImageCompositorService;
  const RED = [255, 0, 0, 255] as [number, number, number, number];
  const BLUE = [0, 0, 255, 255] as [number, number, number, number];

  beforeEach(() => {
    service = new CarouselImageCompositorService();
  });

  it('places a top-left logo near the top-left corner, leaving the opposite corner untouched', async () => {
    const base = await solidPng(200, 200, RED);
    const logo = await solidPng(40, 40, BLUE);

    const out = await service.compositeLogo(base, logo, {
      position: 'top-left',
      widthPct: 20, // -> 40px wide on a 200px-wide base
      opacity: 1,
    });

    // Margin is 4% of 200 = 8px, so the logo occupies roughly x:[8,48), y:[8,48).
    const insideLogo = await pixelAt(out, 25, 25);
    expect(insideLogo.b).toBeGreaterThan(200); // blue
    expect(insideLogo.r).toBeLessThan(50);

    const oppositeCorner = await pixelAt(out, 190, 190);
    expect(oppositeCorner.r).toBeGreaterThan(200); // still the base's red
    expect(oppositeCorner.b).toBeLessThan(50);
  });

  it('places a bottom-right logo near the bottom-right corner', async () => {
    const base = await solidPng(200, 200, RED);
    const logo = await solidPng(40, 40, BLUE);

    const out = await service.compositeLogo(base, logo, {
      position: 'bottom-right',
      widthPct: 20,
      opacity: 1,
    });

    const nearBottomRight = await pixelAt(out, 175, 175);
    expect(nearBottomRight.b).toBeGreaterThan(200);

    const topLeftCorner = await pixelAt(out, 10, 10);
    expect(topLeftCorner.r).toBeGreaterThan(200);
  });

  it('honours a custom centre-fraction position', async () => {
    const base = await solidPng(200, 200, RED);
    const logo = await solidPng(20, 20, BLUE);

    const out = await service.compositeLogo(base, logo, {
      position: 'custom',
      x: 0.75,
      y: 0.25,
      widthPct: 10, // -> 20px on a 200px base
      opacity: 1,
    });

    // Centre at (150, 50) with a 20px logo -> roughly x:[140,160), y:[40,60).
    const nearTarget = await pixelAt(out, 150, 50);
    expect(nearTarget.b).toBeGreaterThan(200);

    const centre = await pixelAt(out, 100, 100);
    expect(centre.r).toBeGreaterThan(200);
  });

  it('scales the logo width to the requested percentage of the base image', async () => {
    const base = await solidPng(400, 400, RED);
    const logo = await solidPng(100, 100, BLUE); // square, so height scales with width

    const out = await service.compositeLogo(base, logo, {
      position: 'center',
      widthPct: 25, // -> 100px wide on a 400px base
      opacity: 1,
    });

    // Centred: occupies roughly x:[150,250), y:[150,250).
    const inside = await pixelAt(out, 200, 200);
    expect(inside.b).toBeGreaterThan(200);
    // Just outside the expected 100px-wide box, still base colour.
    const outside = await pixelAt(out, 260, 200);
    expect(outside.r).toBeGreaterThan(200);
  });

  it('applies partial opacity by scaling the logo alpha, blending it toward the base colour', async () => {
    const base = await solidPng(200, 200, RED);
    const logo = await solidPng(200, 200, BLUE); // fills the whole canvas so we can read a clean blend

    const opaque = await service.compositeLogo(base, logo, {
      position: 'center',
      widthPct: 100,
      opacity: 1,
    });
    const half = await service.compositeLogo(base, logo, {
      position: 'center',
      widthPct: 100,
      opacity: 0.5,
    });

    const opaquePixel = await pixelAt(opaque, 100, 100);
    const halfPixel = await pixelAt(half, 100, 100);

    expect(opaquePixel.b).toBeGreaterThan(200); // fully blue
    expect(opaquePixel.r).toBeLessThan(20);
    // At 50% opacity, red (base) and blue (logo) should visibly blend -
    // some red bleeds back through, no longer near-zero.
    expect(halfPixel.r).toBeGreaterThan(60);
    expect(halfPixel.b).toBeGreaterThan(60);
  });

  it('clamps widthPct into a sane range instead of letting the logo swallow or vanish from the image', async () => {
    const base = await solidPng(200, 200, RED);
    const logo = await solidPng(50, 50, BLUE);

    const tooBig = await service.compositeLogo(base, logo, {
      position: 'center',
      widthPct: 500, // absurd input from a bad client
      opacity: 1,
    });
    // Should still be a valid 200x200 image, not crash or exceed the canvas.
    const meta = await sharp(tooBig).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(200);
  });
});

describe('CarouselImageCompositorService.streamZip', () => {
  it('writes a valid zip archive containing every entry', async () => {
    const service = new CarouselImageCompositorService();
    const { PassThrough } = await import('stream');
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on('data', (chunk) => chunks.push(chunk));

    const img1 = await solidPng(10, 10, [255, 0, 0, 255]);
    const img2 = await solidPng(10, 10, [0, 255, 0, 255]);

    await service.streamZip(sink, [
      { filename: 'slide-1.png', buffer: img1 },
      { filename: 'slide-2.png', buffer: img2 },
    ]);

    const zipBuffer = Buffer.concat(chunks);
    // A real zip file starts with the local-file-header signature "PK\x03\x04".
    expect(zipBuffer.slice(0, 4).toString('hex')).toBe('504b0304');
    expect(zipBuffer.includes('slide-1.png')).toBe(true);
    expect(zipBuffer.includes('slide-2.png')).toBe(true);
  });
});

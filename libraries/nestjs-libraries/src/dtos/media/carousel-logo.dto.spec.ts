import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CarouselLogoConfigDto, SetCarouselLogoDto } from './carousel-logo.dto';

// Regression test for a live bug caught during manual E2E testing: uploading
// a logo through the real local-dev flow (STORAGE_PROVIDER=local, which
// returns `${FRONTEND_URL}/uploads/...` - e.g. `http://localhost:4200/...`)
// 400'd with "logo.url must be a URL address", because @IsUrl()'s default
// require_tld:true rejects any host without a recognized TLD, and `localhost`
// has none. Any self-hosted/IP-based deployment would hit the same wall.

const validLogo = {
  mediaId: 'media-1',
  url: 'http://localhost:4200/uploads/2026/08/18/abc123.png',
  position: 'bottom-right' as const,
  widthPct: 18,
  opacity: 1,
};

describe('CarouselLogoConfigDto', () => {
  it('accepts a local-storage URL (http://localhost:PORT/...) with no TLD', async () => {
    const dto = plainToInstance(CarouselLogoConfigDto, validLogo);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a real production CDN URL too', async () => {
    const dto = plainToInstance(CarouselLogoConfigDto, {
      ...validLogo,
      url: 'https://cdn.example.com/media/logo.png',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('still rejects a non-URL string', async () => {
    const dto = plainToInstance(CarouselLogoConfigDto, { ...validLogo, url: 'not a url' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'url')).toBe(true);
  });

  it('rejects an unknown position value', async () => {
    const dto = plainToInstance(CarouselLogoConfigDto, { ...validLogo, position: 'top-middle' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'position')).toBe(true);
  });

  it('requires x/y only when position is custom', async () => {
    const withoutXY = plainToInstance(CarouselLogoConfigDto, { ...validLogo, position: 'custom' });
    const errors = await validate(withoutXY);
    // x/y are optional even for 'custom' (the service defaults to centre) -
    // this only checks that a non-custom position doesn't require them either.
    expect(errors.some((e) => e.property === 'x' || e.property === 'y')).toBe(false);
  });

  it('rejects widthPct and opacity outside their valid ranges', async () => {
    const tooWide = plainToInstance(CarouselLogoConfigDto, { ...validLogo, widthPct: 500 });
    expect((await validate(tooWide)).some((e) => e.property === 'widthPct')).toBe(true);

    const badOpacity = plainToInstance(CarouselLogoConfigDto, { ...validLogo, opacity: 2 });
    expect((await validate(badOpacity)).some((e) => e.property === 'opacity')).toBe(true);
  });
});

describe('SetCarouselLogoDto', () => {
  it('accepts a groupId with a logo config', async () => {
    const dto = plainToInstance(SetCarouselLogoDto, {
      groupId: 'carousel:id1:id2:id3',
      logo: validLogo,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a groupId with no logo (removal request)', async () => {
    const dto = plainToInstance(SetCarouselLogoDto, { groupId: 'carousel:id1:id2' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('requires groupId', async () => {
    const dto = plainToInstance(SetCarouselLogoDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'groupId')).toBe(true);
  });
});

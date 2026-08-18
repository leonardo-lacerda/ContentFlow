import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const CAROUSEL_LOGO_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
  'custom',
] as const;

export class CarouselLogoConfigDto {
  @IsString()
  @MaxLength(256)
  mediaId: string;

  // require_tld: false - local/self-hosted storage (STORAGE_PROVIDER=local)
  // legitimately produces `${FRONTEND_URL}/uploads/...` URLs, and in local
  // dev FRONTEND_URL is `http://localhost:4200` - a host with no TLD, which
  // IsUrl's default rejects. Confirmed live: uploading a logo through the
  // real local dev flow 400'd with "logo.url must be a URL address" until
  // this option was added.
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(2000)
  url: string;

  @IsIn(CAROUSEL_LOGO_POSITIONS)
  position: (typeof CAROUSEL_LOGO_POSITIONS)[number];

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @ValidateIf((o) => o.position === 'custom')
  x?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @ValidateIf((o) => o.position === 'custom')
  y?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  widthPct: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  opacity: number;
}

export class SetCarouselLogoDto {
  // The synthetic "carousel:<id1>:<id2>:..." id `getMedia` already produces -
  // the frontend never has to look up child ids separately.
  @IsString()
  @MaxLength(4000)
  groupId: string;

  @ValidateNested()
  @Type(() => CarouselLogoConfigDto)
  @IsOptional()
  logo?: CarouselLogoConfigDto;
}

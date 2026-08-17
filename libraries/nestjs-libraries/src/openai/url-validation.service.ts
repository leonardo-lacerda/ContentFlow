import { Injectable } from '@nestjs/common';
import { UrlValidator } from '@gitroom/nestjs-libraries/security/url-validator';

export interface ValidatedUrl {
  url: string;
  hostname: string;
  finalUrl: string;
}

export interface ValidationError {
  code: string;
  message: string;
}

@Injectable()
export class UrlValidationService {
  async validate(
    rawUrl: string,
  ): Promise<
    { success: true; data: ValidatedUrl } | { success: false; error: ValidationError }
  > {
    const normalizedUrl = this.normalizeUrl(rawUrl);
    let hostname = '';

    try {
      hostname = new URL(normalizedUrl).hostname;
    } catch {
      return {
        success: false,
        error: { code: 'INVALID_URL', message: 'Invalid URL' },
      };
    }

    const validation = await UrlValidator.validate(normalizedUrl);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'URL_BLOCKED',
          message: validation.error || 'URL blocked by security policy',
        },
      };
    }

    return {
      success: true,
      data: {
        url: normalizedUrl,
        hostname,
        // Redirects are revalidated by UrlValidator.safeFetch at download
        // time; do not issue a second unpinned HEAD request here.
        finalUrl: normalizedUrl,
      },
    };
  }

  private normalizeUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

}

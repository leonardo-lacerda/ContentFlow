import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { ExtractContentService } from '@gitroom/nestjs-libraries/openai/extract.content.service';
import { UrlValidator } from '@gitroom/nestjs-libraries/security/url-validator';

export interface WebsiteMetadata {
  url: string;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogType?: string;
  favicon?: string;
  images: string[];
  logo?: string;
  mainText: string;
  extractedAt: Date;
}

const MAX_TEXT_SIZE = 50 * 1024; // 50KB
const LOGO_KEYWORDS = ['logo', 'brand', 'site-logo', 'header-logo'];

@Injectable()
export class WebsiteMetadataExtractor {
  constructor(private extractContentService: ExtractContentService) {}

  async extract(url: string): Promise<WebsiteMetadata> {
    const response = await UrlValidator.safeFetch(url, {
      headers: { 'User-Agent': 'ContentFlow/1.0', Accept: 'text/html, application/xhtml+xml' },
      timeout: 15000,
      maxSize: MAX_TEXT_SIZE,
    });
    if (!response.ok || !response.text) {
      throw new Error(response.error || 'Unable to fetch website metadata');
    }

    const html = response.text;
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // 1. Title
    const title = doc.querySelector('title')?.textContent?.trim() || undefined;

    // 2. OG tags
    const ogTitle = this.getMetaContent(doc, 'og:title');
    const ogDescription = this.getMetaContent(doc, 'og:description');
    const ogImage = this.getMetaContent(doc, 'og:image');
    const ogSiteName = this.getMetaContent(doc, 'og:site_name');
    const ogType = this.getMetaContent(doc, 'og:type');

    // 3. Description
    const description = this.getMetaContent(doc, 'description') || ogDescription;

    // 4. Favicon
    const favicon = this.extractFavicon(doc, url);

    // 5. Images (top 10, min 100x100)
    const images = this.extractImages(doc, url);

    // 6. Logo detection
    const logo = this.detectLogo(doc, url);

    // 7. Main text (reuse ExtractContentService)
    const mainText = await this.extractMainText(html, url);

    // 8. Sanitize HTML for main text
    const sanitizedText = this.sanitizeText(mainText);

    return {
      url,
      title,
      description,
      ogTitle,
      ogDescription,
      ogImage,
      ogSiteName,
      ogType,
      favicon,
      images,
      logo,
      mainText: sanitizedText.slice(0, MAX_TEXT_SIZE),
      extractedAt: new Date(),
    };
  }

  private getMetaContent(doc: Document, name: string): string | undefined {
    // Try property (OG) first, then name
    const el =
      doc.querySelector(`meta[property="${name}"]`) ||
      doc.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute('content')?.trim() || undefined;
  }

  private extractFavicon(doc: Document, baseUrl: string): string | undefined {
    const link =
      doc.querySelector('link[rel="icon"]') ||
      doc.querySelector('link[rel="shortcut icon"]') ||
      doc.querySelector('link[rel="apple-touch-icon"]');
    if (link) {
      const href = link.getAttribute('href');
      if (href) return new URL(href, baseUrl).toString();
    }
    // Fallback
    return new URL('/favicon.ico', baseUrl).toString();
  }

  private extractImages(doc: Document, baseUrl: string): string[] {
    const images: string[] = [];
    const imgElements = doc.querySelectorAll('img');

    for (const img of imgElements) {
      const src = img.getAttribute('src');
      const width = parseInt(img.getAttribute('width') || '0');
      const height = parseInt(img.getAttribute('height') || '0');

      if (!src) continue;

      // Filter out small icons, tracking pixels, data URIs
      if (src.startsWith('data:') || src.startsWith('blob:')) continue;
      if ((width > 0 && width < 100) || (height > 0 && height < 100)) continue;

      try {
        const fullUrl = new URL(src, baseUrl).toString();
        images.push(fullUrl);
      } catch {
        // Skip invalid URLs
      }

      if (images.length >= 10) break;
    }

    return images;
  }

  private detectLogo(doc: Document, baseUrl: string): string | undefined {
    // 1. Try common logo CSS classes/IDs
    const logoSelectors = [
      '.logo',
      '#logo',
      '.site-logo',
      '.brand-logo',
      '.header-logo',
      '[class*="logo"]',
      '[id*="logo"]',
    ];
    for (const selector of logoSelectors) {
      const el = doc.querySelector(selector) as HTMLImageElement | null;
      if (el?.tagName === 'IMG' && el.getAttribute('src')) {
        return new URL(el.getAttribute('src')!, baseUrl).toString();
      }
    }

    // 2. Try images with "logo" in alt text
    const imgElements = doc.querySelectorAll('img');
    for (const img of imgElements) {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const src = img.getAttribute('src');
      if (src && alt.includes('logo')) {
        return new URL(src, baseUrl).toString();
      }
    }

    // 3. Try OG image as logo fallback
    const ogImage = this.getMetaContent(doc, 'og:image');
    return ogImage || undefined;
  }

  private async extractMainText(html: string, url: string): Promise<string> {
    // Use the existing service or manual extraction
    try {
      const text = await this.extractContentService.extractContent(url);
      return text || '';
    } catch {
      return '';
    }
  }

  private sanitizeText(text: string): string {
    return text
      .replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        ''
      )
      .replace(
        /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
        ''
      )
      .replace(
        /<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi,
        ''
      )
      .replace(
        /<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi,
        ''
      )
      .replace(
        /<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi,
        ''
      )
      .replace(/\n\s+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

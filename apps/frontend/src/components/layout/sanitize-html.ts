/**
 * HTML sanitizer for dangerouslySetInnerHTML usage.
 *
 * SSR: strips all HTML tags (safe default).
 * Client with DOMPurify: allow-list sanitization.
 * Client without DOMPurify: regex fallback removing dangerous patterns.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'strike',
  'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'span', 'div', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
]);

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'class', 'style',
]);

function regexSanitize(dirty: string): string {
  // Remove script/style tags and their content
  let clean = dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove on* event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  // Remove javascript: URIs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  clean = clean.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');
  // Remove data: URIs on src (except images)
  clean = clean.replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, '');
  return clean;
}

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  // Server-side: strip all HTML
  if (typeof window === 'undefined') {
    return dirty.replace(/<[^>]*>/g, '');
  }

  // Try DOMPurify first
  try {
    // Dynamic import check — DOMPurify may not be installed
    const DOMPurify = (window as Record<string, unknown>).__DOMPurify as
      | { sanitize: (s: string, o: Record<string, unknown>) => string }
      | undefined;

    if (DOMPurify?.sanitize) {
      return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [...ALLOWED_TAGS],
        ALLOWED_ATTR: [...ALLOWED_ATTRS],
        ALLOW_DATA_ATTR: true,
      });
    }
  } catch {
    // Fall through to regex
  }

  // Regex fallback
  return regexSanitize(dirty);
}

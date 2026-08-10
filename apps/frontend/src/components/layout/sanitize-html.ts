/**
 * HTML sanitizer for dangerouslySetInnerHTML usage.
 *
 * Backed by DOMPurify on both server and client. The previous version looked
 * for a `window.__DOMPurify` global that nothing ever assigned, so in the
 * browser it always fell through to a regex pass that missed, among others,
 * `<svg/onload=...>` (the handler pattern required leading whitespace) and
 * unquoted `href=javascript:...`.
 */

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'strike',
  'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'span', 'div', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
];

// `style` is deliberately absent: ALLOWED_URI_REGEXP does not reach inside CSS,
// so an inline style survives with `url(javascript:...)` and with layout tricks
// usable for UI redress. sanitizePostContent (the canonical post sanitizer in
// libraries/helpers) drops it too, so previews already render without it.
const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'class',
];

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    // Blocks javascript:, vbscript: and non-image data: URIs on href/src.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/|\/|#)/i,
    // Setting ALLOWED_URI_REGEXP makes DOMPurify run that test against every
    // allowed attribute, so `target="_blank"` and `rel="noopener"` fail it and
    // get dropped. Neither holds a URI, so exempt them explicitly.
    ADD_URI_SAFE_ATTR: ['target', 'rel'],
  });
}

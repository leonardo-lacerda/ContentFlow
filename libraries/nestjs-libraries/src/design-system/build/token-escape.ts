const ALLOWED_TAGS = [
  '<em>',
  '</em>',
  '<strong>',
  '</strong>',
  '<mark>',
  '</mark>',
  '<br>',
  '<br/>',
  '<br />',
] as const;

/**
 * Escape user copy for HTML templates, then restore a small set of inline tags
 * and convert newlines to <br> (xniper new_post.py parity).
 */
export function escapeDesignCopy(value: unknown, fallback = ''): string {
  let raw = value == null ? fallback : String(value);
  if (!raw && fallback) {
    raw = fallback;
  }

  let escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  for (const tag of ALLOWED_TAGS) {
    const escapedTag = tag
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    escaped = escaped.split(escapedTag).join(tag);
  }

  return escaped.replace(/\r\n|\n|\r/g, '<br>');
}

export function fillTemplateTokens(
  html: string,
  tokens: Record<string, string>
): { html: string; leftover: string[] } {
  const out = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(tokens, key)) {
      return tokens[key];
    }
    return `{{${key}}}`;
  });

  const leftover = Array.from(
    new Set(Array.from(out.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)).map((m) => m[1]))
  );

  return { html: out, leftover };
}

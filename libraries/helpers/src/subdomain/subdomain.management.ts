import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string) {
  const url = parse(domain);
  const host = url.hostname || '';

  // Browsers reject the Domain attribute on bare IPs — omit it so the cookie
  // is scoped to the exact host that set it (works for http://x.x.x.x:port).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    return undefined as unknown as string;
  }

  return url.domain ? '.' + url.domain : host;
}

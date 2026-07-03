/**
 * Individual block renderers for email HTML.
 * Each function takes a block config and returns an inline-styled HTML string.
 * All CSS is inline — no <style> blocks, no class attributes.
 * Layout uses HTML tables for Outlook compatibility.
 */

// ---- Types ----

interface BlockBase {
  type: string;
  marginTop?: number;
  marginBottom?: number;
}

interface TextBlock extends BlockBase {
  type: 'text';
  content: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: number;
  color?: string;
}

interface HeadingBlock extends BlockBase {
  type: 'heading';
  level?: 'h1' | 'h2' | 'h3';
  content?: string;
  text?: string;
  alignment?: 'left' | 'center' | 'right';
  color?: string;
}

interface ImageBlock extends BlockBase {
  type: 'image';
  src?: string;
  url?: string;
  alt?: string;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  linkUrl?: string;
}

interface DividerBlock extends BlockBase {
  type: 'divider';
  color?: string;
}

interface CtaBlock extends BlockBase {
  type: 'cta';
  text: string;
  url: string;
  color?: string;
  textColor?: string;
  alignment?: 'left' | 'center' | 'right';
  borderRadius?: number;
}

interface CarouselCard {
  imageUrl?: string;
  image?: string;
  title: string;
  summary?: string;
  text?: string;
  linkUrl?: string;
}

interface CarouselBlock extends BlockBase {
  type: 'carousel';
  cards?: CarouselCard[];
  slides?: Array<{ image: string; title: string; text?: string }>;
  layout?: 'horizontal' | 'stacked';
}

interface SpacerBlock extends BlockBase {
  type: 'spacer';
  height?: number;
}

interface SocialLink {
  name: string;
  url: string;
  icon?: string;
}

interface SocialLinksBlock extends BlockBase {
  type: 'social_links';
  networks: SocialLink[];
  alignment?: 'left' | 'center' | 'right';
}

type EmailBlock = TextBlock | HeadingBlock | ImageBlock | DividerBlock | CtaBlock | CarouselBlock | SpacerBlock | SocialLinksBlock;

// ---- Helpers ----

function alignAttr(alignment?: string): string {
  switch (alignment) {
    case 'right': return 'right';
    case 'center': return 'center';
    default: return 'left';
  }
}

function marginStyle(mt?: number, mb?: number): string {
  const parts: string[] = [];
  if (mt) parts.push(`margin-top:${mt}px`);
  if (mb) parts.push(`margin-bottom:${mb}px`);
  return parts.length ? ` style="${parts.join(';')}"` : '';
}

// ---- Block Renderers ----

export function renderTextBlock(block: TextBlock): string {
  const align = alignAttr(block.alignment);
  const fontSize = block.fontSize ? `font-size:${block.fontSize}px;` : 'font-size:16px;';
  const color = block.color ? `color:${block.color};` : 'color:#333333;';
  const mt = block.marginTop || 0;
  const mb = block.marginBottom || 16;

  return `<tr><td style="padding:0 0 ${mb}px 0;text-align:${align};">
  <p style="margin:0;${fontSize}${color}line-height:1.6;font-family:Arial,Helvetica,sans-serif;">${block.content}</p>
</td></tr>`;
}

export function renderHeadingBlock(block: HeadingBlock): string {
  const align = alignAttr(block.alignment || 'center');
  const content = block.content || block.text || '';
  const color = block.color ? `color:${block.color};` : 'color:#1a1a1a;';
  const mb = block.marginBottom || 16;

  let fontSize: string;
  let fontWeight = 'font-weight:bold;';
  switch (block.level) {
    case 'h1': fontSize = 'font-size:28px;'; break;
    case 'h3': fontSize = 'font-size:18px;'; break;
    default: fontSize = 'font-size:22px;'; break;
  }

  return `<tr><td style="padding:0 0 ${mb}px 0;text-align:${align};">
  <${block.level || 'h2'} style="margin:0;${fontSize}${fontWeight}${color}font-family:Arial,Helvetica,sans-serif;">${content}</${block.level || 'h2'}>
</td></tr>`;
}

export function renderImageBlock(block: ImageBlock): string {
  const align = alignAttr(block.alignment || 'center');
  const src = block.src || block.url || '';
  const alt = block.alt || '';
  const widthAttr = block.width ? `width="${block.width}"` : 'width="100%"';
  const mb = block.marginBottom || 16;

  const imgTag = `<img src="${src}" alt="${alt}" ${widthAttr} style="max-width:100%;height:auto;display:block;border:0;" />`;

  const content = block.linkUrl
    ? `<a href="${block.linkUrl}" target="_blank" style="display:block;text-decoration:none;">${imgTag}</a>`
    : imgTag;

  return `<tr><td style="padding:0 0 ${mb}px 0;text-align:${align};">
  ${content}
</td></tr>`;
}

export function renderDividerBlock(block: DividerBlock): string {
  const color = block.color || '#cccccc';
  const mt = block.marginTop || 24;
  const mb = block.marginBottom || 24;

  return `<tr><td style="padding:${mt}px 0 ${mb}px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${color};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
</td></tr>`;
}

export function renderCtaBlock(block: CtaBlock): string {
  const align = alignAttr(block.alignment || 'center');
  const bg = block.color || '#007bff';
  const textColor = block.textColor || '#ffffff';
  const radius = block.borderRadius ?? 4;
  const mb = block.marginBottom || 16;

  return `<tr><td style="padding:0 0 ${mb}px 0;text-align:${align};">
  <table cellpadding="0" cellspacing="0" border="0"${align === 'center' ? ' style="margin:0 auto;"' : ''}><tr><td style="background:${bg};border-radius:${radius}px;padding:14px 28px;text-align:center;">
    <a href="${block.url}" target="_blank" style="color:${textColor};font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;text-decoration:none;display:inline-block;">${block.text}</a>
  </td></tr></table>
</td></tr>`;
}

export function renderCarouselBlock(block: CarouselBlock): string {
  const items = (block.cards || block.slides || []).map((card: any) => {
    const imageUrl = card.imageUrl || card.image || '';
    const title = card.title || '';
    const summary = card.summary || card.text || '';
    const linkUrl = card.linkUrl || '';

    const imgTag = `<img src="${imageUrl}" alt="${title}" width="260" style="max-width:100%;height:auto;display:block;border:0;" />`;
    const imgContent = linkUrl ? `<a href="${linkUrl}" target="_blank" style="display:block;text-decoration:none;">${imgTag}</a>` : imgTag;

    return `<td style="vertical-align:top;padding:8px;width:33%;" class="email-carousel-card">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9f9;border-radius:8px;overflow:hidden;">
    <tr><td>${imgContent}</td></tr>
    <tr><td style="padding:12px;">
      <p style="margin:0 0 8px 0;font-size:16px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">${title}</p>
      ${summary ? `<p style="margin:0;font-size:14px;color:#555555;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">${summary}</p>` : ''}
    </td></tr>
  </table>
</td>`;
  });

  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(`<tr>${items.slice(i, i + 3).join('\n')}</tr>`);
  }

  const mb = block.marginBottom || 16;

  return `<tr><td style="padding:0 0 ${mb}px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${rows.join('\n')}
  </table>
</td></tr>`;
}

export function renderSpacerBlock(block: SpacerBlock): string {
  const height = block.height || 20;
  return `<tr><td style="padding:0;font-size:1px;line-height:${height}px;">&nbsp;</td></tr>`;
}

export function renderSocialLinksBlock(block: SocialLinksBlock): string {
  const align = alignAttr(block.alignment || 'center');
  const mb = block.marginBottom || 16;

  const icons: Record<string, string> = {
    instagram: '📷',
    twitter: '🐦',
    x: '✖',
    facebook: '📘',
    linkedin: '💼',
    youtube: '🎬',
    tiktok: '🎵',
    pinterest: '📌',
    github: '🐙',
  };

  const links = block.networks.map(n => {
    const icon = icons[n.name.toLowerCase()] || '🔗';
    return `<a href="${n.url}" target="_blank" style="display:inline-block;margin:0 8px;text-decoration:none;font-size:24px;" title="${n.name}">${icon}</a>`;
  }).join('');

  return `<tr><td style="padding:0 0 ${mb}px 0;text-align:${align};">
  ${links}
</td></tr>`;
}

// ---- Dispatch ----

export function renderBlock(block: EmailBlock): string {
  switch (block.type) {
    case 'text': return renderTextBlock(block);
    case 'heading': return renderHeadingBlock(block);
    case 'image': return renderImageBlock(block);
    case 'divider': return renderDividerBlock(block);
    case 'cta': return renderCtaBlock(block);
    case 'carousel': return renderCarouselBlock(block);
    case 'spacer': return renderSpacerBlock(block);
    case 'social_links': return renderSocialLinksBlock(block);
    default: return '';
  }
}

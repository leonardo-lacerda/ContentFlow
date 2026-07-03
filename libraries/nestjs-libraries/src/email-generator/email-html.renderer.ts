/**
 * Renders an EmailCampaign's blocks[] into portable, inline-styled HTML.
 *
 * Output rules:
 * - 600px max width table layout
 * - All CSS inline
 * - No <style> blocks
 * - No class attributes
 * - Mobile-friendly (images scale, text wraps)
 * - Works in Gmail, Outlook (2016+), Apple Mail, Yahoo
 */

import { renderBlock } from './email-block-renderers';

export function renderEmailHtml(campaign: {
  blocks: Array<Record<string, any>>;
  subject?: string;
  primaryColor?: string;
  secondaryColor?: string;
  headerImageUrl?: string;
  logoUrl?: string;
  preheader?: string;
}): string {
  const primaryColor = campaign.primaryColor || '#3b82f6';
  const secondaryColor = campaign.secondaryColor || '#1e40af';

  // Render header image if provided
  const headerImageHtml = campaign.headerImageUrl
    ? `<tr><td style="padding:0;">
        <img src="${campaign.headerImageUrl}" alt="" width="600" style="max-width:100%;height:auto;display:block;border:0;" />
      </td></tr>`
    : '';

  // Render logo if provided
  const logoHtml = campaign.logoUrl
    ? `<tr><td style="padding:24px 32px 16px 32px;text-align:center;">
        <img src="${campaign.logoUrl}" alt="Logo" style="max-height:60px;width:auto;display:inline-block;border:0;" />
      </td></tr>`
    : '';

  // Render all blocks
  const blocksHtml = campaign.blocks
    .map((block: any) => renderBlock(block))
    .filter(Boolean)
    .join('\n');

  // Preheader (hidden text for inbox preview)
  const preheaderHtml = campaign.preheader
    ? `<div style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${campaign.preheader}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${campaign.subject || 'Email'}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .mso-padding { padding: 0 !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  ${preheaderHtml}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;">
    <tr><td align="center" style="padding:20px 0;">
      <!--[if mso]>
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td>
      <![endif]-->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
        ${logoHtml}
        ${headerImageHtml}
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${blocksHtml}
          </table>
        </td></tr>
      </table>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Simple HTML renderer used by the existing service (backward-compatible).
 * Takes blocks array and optional CTA info, returns full HTML document.
 */
export function renderSimpleEmailHtml(data: {
  blocks: Array<Record<string, any>>;
  subject?: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaColor?: string;
}): string {
  // If CTA is provided at the top level, inject it as a block
  const blocks = [...data.blocks];
  if (data.ctaText && data.ctaUrl) {
    blocks.push({
      type: 'cta',
      text: data.ctaText,
      url: data.ctaUrl,
      color: data.ctaColor || '#3b82f6',
    });
  }

  return renderEmailHtml({
    blocks,
    subject: data.subject,
  });
}

'use client';

import React, { useEffect, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { emailCampaignsApi } from './email-campaigns.api';
import type { EmailCampaign } from './email-campaigns.types';

export function EmailPreviewPanel({
  campaign,
  onClose,
}: {
  campaign: EmailCampaign;
  onClose: () => void;
}) {
  const fetch = useFetch();
  const toaster = useToaster();
  const [html, setHtml] = useState(campaign.bodyHtml || '');
  const [loading, setLoading] = useState(!html);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (html) return;
    (async () => {
      try {
        const data = await emailCampaignsApi.preview(fetch, campaign.id);
        setHtml(data.html);
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    })();
  }, [campaign.id, fetch, html]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await emailCampaignsApi.exportHtml(fetch, campaign.id);
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `${campaign.name}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toaster.show('HTML exportado', 'success');
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao exportar', 'warning');
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    toaster.show('HTML copiado', 'success');
  };

  const iframeWidth = device === 'mobile' ? '375px' : '100%';

  return (
    <div className="flex flex-col gap-3">
      {/* Campaign info */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-newTextColor truncate">{campaign.name}</h3>
          <p className="text-xs text-textItemBlur mt-0.5">
            Assunto: {campaign.subject}
            {campaign.preheader ? ` · ${campaign.preheader}` : ''}
          </p>
          <p className="text-[11px] text-textItemBlur mt-0.5">
            {campaign.bodyJson?.blocks?.length || 0} blocos · {campaign.exportCount} exports
          </p>
        </div>
      </div>

      {/* Device toggle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setDevice('desktop')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            device === 'desktop' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setDevice('mobile')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            device === 'mobile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Mobile
        </button>
      </div>

      {/* Preview */}
      <div className="rounded-[10px] border border-newTableBorder bg-white overflow-hidden flex justify-center">
        {loading ? (
          <div className="p-6 text-sm text-textItemBlur">Carregando preview...</div>
        ) : html ? (
          <iframe
            title="preview"
            srcDoc={html}
            className="border-0 bg-white"
            style={{ width: iframeWidth, minHeight: 500, maxHeight: '60vh' }}
          />
        ) : (
          <div className="p-6 text-sm text-textItemBlur">Sem preview disponível</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button secondary className="!h-8 !text-xs" onClick={handleCopy} disabled={!html}>
          Copiar HTML
        </Button>
        <Button className="!h-8 !text-xs" loading={exporting} onClick={handleExport}>
          Exportar HTML
        </Button>
      </div>
    </div>
  );
}

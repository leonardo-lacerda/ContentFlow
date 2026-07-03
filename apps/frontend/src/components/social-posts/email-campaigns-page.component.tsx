'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

// ---- Types ----

type CampaignType = 'NEWSLETTER' | 'WELCOME_SEQUENCE' | 'PROMOTIONAL';
type CampaignStatus = 'DRAFT' | 'GENERATING' | 'READY' | 'EXPORTED' | 'FAILED';

interface EmailCampaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  preheader?: string;
  bodyHtml: string;
  bodyJson?: { blocks: any[] };
  ctaText?: string;
  ctaUrl?: string;
  ctaColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  sequenceIndex?: number;
  sequenceTotal?: number;
  sequenceDelayDays?: number;
  exportCount: number;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  category: string;
  exampleSubjects: string[];
}

// ---- Main Component ----

export function EmailCampaignsPage() {
  const fetch = useFetch();

  // Tab state
  const [activeTab, setActiveTab] = useState<'all' | CampaignType>('all');

  // Campaign list
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate dialog
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [brandProfileId, setBrandProfileId] = useState('');
  const [campaignType, setCampaignType] = useState<string>('newsletter');
  const [campaignName, setCampaignName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Welcome sequence
  const [sequenceLength, setSequenceLength] = useState(3);

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Preview/Export
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  // ---- Load campaigns ----

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeTab !== 'all' ? `?type=${activeTab}` : '';
      const res = await fetch(`/email-campaigns${query}`);
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } catch (e) {
      console.error('Failed to load campaigns', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetch]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ---- Load templates ----

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/email-campaigns/templates');
        if (res.ok) setTemplates(await res.json());
      } catch {}
    })();
  }, [fetch]);

  // ---- Generate ----

  const handleGenerate = async () => {
    if (!brandProfileId || !campaignName) return;
    setGenerating(true);
    setGenerateError(null);

    try {
      const endpoint = campaignType === 'welcome_sequence'
        ? '/email-campaigns/generate-welcome-sequence'
        : '/email-campaigns/generate';

      const body = campaignType === 'welcome_sequence'
        ? { brandProfileId, sequenceLength, additionalContext }
        : { brandProfileId, campaignType, name: campaignName, templateId: templateId || undefined, additionalContext };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Generation failed');

      setShowGenerate(false);
      setCampaignName('');
      setAdditionalContext('');
      loadCampaigns();
    } catch (e: any) {
      setGenerateError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ---- Preview ----

  const handlePreview = async (campaign: EmailCampaign) => {
    setPreviewCampaign(campaign);
    try {
      const res = await fetch(`/email-campaigns/${campaign.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        setHtmlPreview(data.html);
      }
    } catch {
      setHtmlPreview(campaign.bodyHtml);
    }
  };

  // ---- Export ----

  const handleExport = async (campaign: EmailCampaign) => {
    try {
      const res = await fetch(`/email-campaigns/${campaign.id}/export`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `${campaign.name}.html`;
        a.click();
        URL.revokeObjectURL(url);
        loadCampaigns(); // Refresh export count
      }
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  // ---- Delete ----

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await fetch(`/email-campaigns/${id}`, { method: 'DELETE' });
      loadCampaigns();
    } catch {}
  };

  // ---- Helpers ----

  const typeLabel = (type: CampaignType) => {
    switch (type) {
      case 'NEWSLETTER': return 'Newsletter';
      case 'WELCOME_SEQUENCE': return 'Welcome Sequence';
      case 'PROMOTIONAL': return 'Promotional';
      default: return type;
    }
  };

  const statusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'READY': return '#22c55e';
      case 'EXPORTED': return '#3b82f6';
      case 'GENERATING': return '#f59e0b';
      case 'FAILED': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  // ---- Render ----

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Campaign Generator</h1>
          <p style={{ color: 'var(--muted, #888)' }}>
            Generate newsletter, welcome sequence, and promotional email campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="px-4 py-2 text-white rounded text-sm font-medium"
          style={{ background: 'var(--primary, #3b82f6)' }}
        >
          + Generate Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {(['all', 'NEWSLETTER', 'WELCOME_SEQUENCE', 'PROMOTIONAL'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-sm rounded-t ${activeTab === tab ? 'font-semibold' : ''}`}
            style={{
              borderBottom: activeTab === tab ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--primary, #3b82f6)' : 'var(--muted, #888)',
            }}
          >
            {tab === 'all' ? 'All' : typeLabel(tab as CampaignType)}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--muted, #888)' }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 border rounded-lg" style={{ color: 'var(--muted, #888)' }}>
          <p className="text-lg mb-2">No campaigns yet</p>
          <p className="text-sm">Click "Generate Campaign" to create your first email campaign.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <div
              key={campaign.id}
              className="border rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              style={{ background: 'var(--card, white)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{campaign.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ background: statusColor(campaign.status) }}
                  >
                    {campaign.status}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--muted, #f3f4f6)', color: 'var(--muted, #6b7280)' }}>
                    {typeLabel(campaign.type)}
                  </span>
                </div>
                <div className="text-sm truncate" style={{ color: 'var(--muted, #888)' }}>
                  Subject: {campaign.subject}
                  {campaign.sequenceIndex !== undefined && campaign.sequenceTotal !== undefined && (
                    <span className="ml-2">
                      (Email {campaign.sequenceIndex + 1}/{campaign.sequenceTotal}
                      {campaign.sequenceDelayDays !== undefined && `, Day ${campaign.sequenceDelayDays}`})
                    </span>
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted, #aaa)' }}>
                  {new Date(campaign.createdAt).toLocaleDateString()} · {campaign.exportCount} exports
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handlePreview(campaign)}
                  className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                >
                  👁 Preview
                </button>
                <button
                  onClick={() => handleExport(campaign)}
                  className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                >
                  📥 Export
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="px-3 py-1.5 text-xs border rounded hover:bg-red-50 text-red-500"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGenerate(false)}>
          <div
            className="rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
            style={{ background: 'var(--card, white)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Generate Email Campaign</h2>

            <div>
              <label className="block text-sm font-medium mb-1">Brand Profile ID *</label>
              <input
                type="text"
                value={brandProfileId}
                onChange={e => setBrandProfileId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Brand profile ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Campaign Type</label>
              <select
                value={campaignType}
                onChange={e => setCampaignType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="newsletter">Newsletter</option>
                <option value="welcome_sequence">Welcome Sequence</option>
                <option value="promotional">Promotional</option>
              </select>
            </div>

            {campaignType !== 'welcome_sequence' ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Campaign Name *</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g. June Newsletter"
                  />
                </div>

                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Template (optional)</label>
                    <select
                      value={templateId}
                      onChange={e => setTemplateId(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Auto-select</option>
                      {templates.filter(t => {
                        if (campaignType === 'newsletter') return t.category === 'newsletter';
                        if (campaignType === 'promotional') return t.category === 'promotional';
                        return true;
                      }).map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Sequence Length</label>
                <select
                  value={sequenceLength}
                  onChange={e => setSequenceLength(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {[3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} emails</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Additional Context (optional)</label>
              <textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                placeholder="Any specific instructions for the AI..."
              />
            </div>

            {generateError && (
              <div className="p-3 rounded text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
                {generateError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowGenerate(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !brandProfileId || (campaignType !== 'welcome_sequence' && !campaignName)}
                className="px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--primary, #3b82f6)' }}
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setPreviewCampaign(null); setHtmlPreview(null); }}>
          <div
            className="rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--card, white)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{previewCampaign.name}</h2>
                <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
                  Subject: {previewCampaign.subject}
                  {previewCampaign.preheader && ` · Preheader: ${previewCampaign.preheader}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(previewCampaign)}
                  className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                >
                  📥 Export HTML
                </button>
                <button
                  onClick={() => { setPreviewCampaign(null); setHtmlPreview(null); }}
                  className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {htmlPreview ? (
              <div className="border rounded overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 text-xs flex gap-4" style={{ color: 'var(--muted, #888)' }}>
                  <span>Desktop (600px)</span>
                </div>
                <iframe
                  srcDoc={htmlPreview}
                  className="w-full border-t"
                  style={{ height: '500px' }}
                  title="Email Preview"
                />
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--muted, #888)' }}>
                Loading preview...
              </div>
            )}

            {/* Block summary */}
            {previewCampaign.bodyJson?.blocks && (
              <div className="mt-4 space-y-1">
                <h3 className="text-sm font-medium">Content Blocks:</h3>
                {previewCampaign.bodyJson.blocks.map((block: any, i: number) => (
                  <div
                    key={i}
                    className="text-sm p-2 rounded flex items-center gap-2"
                    style={{ background: 'var(--muted, #f5f5f5)' }}
                  >
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--primary, #3b82f6)', color: 'white' }}>
                      {block.type}
                    </span>
                    <span className="truncate" style={{ color: 'var(--muted, #555)' }}>
                      {block.content || block.text || block.alt || block.url || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

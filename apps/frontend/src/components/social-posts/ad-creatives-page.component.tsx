'use client';

import React, { useState, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import type {
  GeneratedAdCreative,
  AdCreativeBatch,
  AdTemplateSummary,
  PolicyWarning,
} from '../ads/ads.types';
import {
  generateAds,
  saveAds,
  listAds,
  getAdTemplates,
} from '../ads/ads.service';

const PLATFORM_LABELS: Record<string, string> = {
  META_FACEBOOK: 'Facebook',
  META_INSTAGRAM: 'Instagram',
  LINKEDIN: 'LinkedIn',
};

const PLATFORM_COLORS: Record<string, string> = {
  META_FACEBOOK: '#1877F2',
  META_INSTAGRAM: '#E4405F',
  LINKEDIN: '#0A66C2',
};

const OBJECTIVES = [
  'AWARENESS',
  'CONSIDERATION',
  'CONVERSION',
  'LEAD_GENERATION',
  'TRAFFIC',
  'ENGAGEMENT',
];

const AD_TYPES = ['AUTO', 'STATIC', 'CAROUSEL'] as const;

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
  };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full text-white"
      style={{ background: colors[severity] || '#6b7280' }}
    >
      {severity}
    </span>
  );
}

function PolicyWarningsList({ warnings }: { warnings: PolicyWarning[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="text-xs flex items-start gap-2 p-2 rounded"
          style={{
            background:
              w.severity === 'critical'
                ? '#fef2f2'
                : w.severity === 'warning'
                ? '#fffbeb'
                : '#eff6ff',
            color:
              w.severity === 'critical'
                ? '#dc2626'
                : w.severity === 'warning'
                ? '#d97706'
                : '#2563eb',
          }}
        >
          <SeverityBadge severity={w.severity} />
          <div>
            <span className="font-medium">[{w.ruleId}]</span> {w.message}
            {w.suggestion && (
              <div className="mt-1 opacity-75">Suggestion: {w.suggestion}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdCreativeCard({
  ad,
  onSave,
}: {
  ad: GeneratedAdCreative;
  onSave?: () => void;
}) {
  return (
    <div
      className="border rounded-lg p-4 space-y-3"
      style={{ background: 'var(--card, white)' }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs px-2 py-1 rounded-full text-white font-medium"
          style={{
            background: PLATFORM_COLORS[ad.platform] || '#6b7280',
          }}
        >
          {PLATFORM_LABELS[ad.platform] || ad.platform}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
          {ad.type}
        </span>
        {ad.adTemplateId && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
            {ad.adTemplateId}
          </span>
        )}
        {ad.policyWarnings?.some((w) => w.severity === 'critical') && (
          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
            Compliance Issue
          </span>
        )}
        {ad.policyWarnings?.some(
          (w) => w.severity === 'warning' && w.severity !== 'critical'
        ) && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
            Warnings
          </span>
        )}
      </div>

      <h3 className="font-semibold text-lg">{ad.headline}</h3>
      <p className="text-sm" style={{ color: 'var(--foreground, #111)' }}>
        {ad.primaryText}
      </p>
      {ad.description && (
        <p className="text-xs" style={{ color: 'var(--muted, #888)' }}>
          {ad.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs">
        <span
          className="px-3 py-1 rounded font-medium text-white"
          style={{ background: 'var(--primary, #3b82f6)' }}
        >
          {ad.ctaButton}
        </span>
        {ad.destinationUrl && (
          <span style={{ color: 'var(--muted, #888)' }} className="truncate max-w-xs">
            {ad.destinationUrl}
          </span>
        )}
      </div>

      {/* Carousel slides preview */}
      {ad.slides && ad.slides.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium mb-1">
            Carousel Slides ({ad.slides.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ad.slides.map((slide, i) => (
              <div
                key={i}
                className="border rounded p-2 text-xs"
                style={{ background: 'var(--background, #fafafa)' }}
              >
                <div className="font-medium">
                  Slide {slide.index + 1}: {slide.headline}
                </div>
                <div style={{ color: 'var(--muted, #888)' }}>{slide.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image prompts */}
      {ad.imagePrompts && ad.imagePrompts.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium mb-1">Image Prompts</p>
          {ad.imagePrompts.map((ip, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--muted, #888)' }}>
              <span className="font-medium">{ip.role}:</span> {ip.prompt}
              {ip.aspectRatio && (
                <span className="ml-1 text-xs opacity-60">({ip.aspectRatio})</span>
              )}
            </div>
          ))}
        </div>
      )}

      <PolicyWarningsList warnings={ad.policyWarnings} />
    </div>
  );
}

export function AdCreativesPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdCreativeBatch | null>(null);
  const [savedAds, setSavedAds] = useState<any[]>([]);
  const [templates, setTemplates] = useState<AdTemplateSummary[]>([]);

  // Form state
  const [brandProfileId, setBrandProfileId] = useState('');
  const [contentObjective, setContentObjective] = useState('');
  const [productOrService, setProductOrService] = useState('');
  const [objective, setObjective] = useState('CONVERSION');
  const [adType, setAdType] = useState<'AUTO' | 'STATIC' | 'CAROUSEL'>('AUTO');
  const [platforms, setPlatforms] = useState<string[]>(['META_INSTAGRAM']);
  const [adTemplateId, setAdTemplateId] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [variants, setVariants] = useState(1);

  // Load templates on mount
  useEffect(() => {
    getAdTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!brandProfileId || !contentObjective) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateAds({
        brandProfileId,
        contentObjective,
        productOrService: productOrService || undefined,
        platforms,
        objective,
        adType,
        adTemplateId: adTemplateId || undefined,
        variants,
        destinationUrl: destinationUrl || undefined,
        additionalContext: additionalContext || undefined,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !brandProfileId) return;
    setSaving(true);
    try {
      const saved = await saveAds({
        ads: result,
        brandProfileId,
      });
      setSavedAds(saved);
      setResult(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ad Creative Generator</h1>
        <p style={{ color: 'var(--muted, #888)' }}>
          Generate AI-powered ad creatives for Meta and LinkedIn campaigns with
          compliance checks.
        </p>
      </div>

      {/* Generation Form */}
      <div
        className="rounded-lg p-6 space-y-4 border"
        style={{ background: 'var(--card, white)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Brand Profile ID *
            </label>
            <input
              type="text"
              value={brandProfileId}
              onChange={(e) => setBrandProfileId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Brand profile ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Campaign Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Content Objective / What to Promote *
          </label>
          <input
            type="text"
            value={contentObjective}
            onChange={(e) => setContentObjective(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. Promote our new AI course for marketers"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Product / Service
            </label>
            <input
              type="text"
              value={productOrService}
              onChange={(e) => setProductOrService(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g. Online AI course"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ad Type</label>
            <select
              value={adType}
              onChange={(e) => setAdType(e.target.value as any)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {AD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <select
              value={adTemplateId}
              onChange={(e) => setAdTemplateId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Auto (AI decides)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.labelEn} — {t.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Destination URL
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Variants</label>
            <input
              type="number"
              min={1}
              max={5}
              value={variants}
              onChange={(e) => setVariants(Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Additional Context
            </label>
            <input
              type="text"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Any extra instructions..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Platforms</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'META_INSTAGRAM', label: 'Instagram' },
              { id: 'META_FACEBOOK', label: 'Facebook' },
              { id: 'LINKEDIN', label: 'LinkedIn' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className="px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                style={
                  platforms.includes(p.id)
                    ? {
                        background: PLATFORM_COLORS[p.id],
                        borderColor: PLATFORM_COLORS[p.id],
                        color: 'white',
                      }
                    : {}
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading || !brandProfileId || !contentObjective}
            className="px-6 py-2 text-white rounded text-sm font-medium disabled:opacity-50 transition-opacity"
            style={{ background: 'var(--primary, #3b82f6)' }}
          >
            {loading ? 'Generating...' : 'Generate Ads'}
          </button>
          {result && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded text-sm font-medium border disabled:opacity-50"
              style={{
                borderColor: 'var(--primary, #3b82f6)',
                color: 'var(--primary, #3b82f6)',
              }}
            >
              {saving ? 'Saving...' : 'Save to Library'}
            </button>
          )}
        </div>

        {error && (
          <div
            className="p-3 rounded text-sm"
            style={{ background: '#fef2f2', color: '#dc2626' }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Generated Results */}
      {result?.ads && result.ads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Generated Creatives ({result.ads.length})
          </h2>
          {result.ads.map((ad, i) => (
            <AdCreativeCard key={i} ad={ad} />
          ))}
        </div>
      )}

      {/* Saved Ads */}
      {savedAds.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Saved to Library ({savedAds.length})
          </h2>
          {savedAds.map((ad, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 text-sm"
              style={{ background: 'var(--card, white)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs px-2 py-1 rounded-full text-white"
                  style={{
                    background: PLATFORM_COLORS[ad.platform] || '#6b7280',
                  }}
                >
                  {PLATFORM_LABELS[ad.platform] || ad.platform}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                  {ad.type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                  {ad.status}
                </span>
              </div>
              <h3 className="font-semibold">{ad.headline}</h3>
              <p style={{ color: 'var(--muted, #888)' }}>{ad.primaryText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

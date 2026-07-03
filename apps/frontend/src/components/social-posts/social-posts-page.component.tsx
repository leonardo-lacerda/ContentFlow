'use client';

import React, { useState } from 'react';
import { SocialPostCard } from './social-post-card.component';
import { useSocialPosts } from './social-posts.hooks';
import type {
  SocialPlatform,
  PostTone,
  GenerateSocialPostsParams,
} from './social-posts.types';
import {
  AVAILABLE_PLATFORMS,
  AVAILABLE_TONES,
  AVAILABLE_LANGUAGES,
} from './social-posts.types';
import { PlatformBadge } from './platform-badge.component';

export function SocialPostsPage() {
  const { generate, generating, error, result, reset } = useSocialPosts();
  const [brandProfileId, setBrandProfileId] = useState('');
  const [contentIdeaId, setContentIdeaId] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'instagram',
    'linkedin',
  ]);
  const [tone, setTone] = useState<PostTone | ''>('');
  const [language, setLanguage] = useState('en-US');
  const [additionalContext, setAdditionalContext] = useState('');

  const handleGenerate = async () => {
    if (selectedPlatforms.length === 0) return;
    // Need at least a topic or a contentIdeaId
    if (!topic && !contentIdeaId) return;

    const params: GenerateSocialPostsParams = {
      brandProfileId: brandProfileId || undefined,
      contentIdeaId: contentIdeaId || undefined,
      topic: topic || undefined,
      platforms: selectedPlatforms,
      tone: tone || undefined,
      language: language || undefined,
      additionalContext: additionalContext || undefined,
    };
    await generate(params);
  };

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const canGenerate =
    selectedPlatforms.length > 0 && (topic.trim() || contentIdeaId.trim());

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social Post Generator</h1>
        <p style={{ color: 'var(--muted, #888)' }}>
          Generate platform-optimized social media posts from your brand
          content or a topic.
        </p>
      </div>

      {/* ── Generation Form ──────────────────────────── */}
      <div
        className="rounded-lg p-6 space-y-5 border"
        style={{ background: 'var(--card, white)' }}
      >
        {/* Topic (standalone) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Topic{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--muted, #888)' }}>
              (standalone — or fill a Content Idea ID below)
            </span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. Product launch announcement, Industry trends, Tips & tricks..."
          />
        </div>

        {/* Brand Profile + Content Idea side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Brand Profile ID{' '}
              <span className="text-xs font-normal" style={{ color: 'var(--muted, #888)' }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={brandProfileId}
              onChange={(e) => setBrandProfileId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Enter brand profile ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Content Idea ID{' '}
              <span className="text-xs font-normal" style={{ color: 'var(--muted, #888)' }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={contentIdeaId}
              onChange={(e) => setContentIdeaId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Enter content idea ID"
            />
          </div>
        </div>

        {/* Platforms */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Platforms{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--muted, #888)' }}>
              ({selectedPlatforms.length} selected)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedPlatforms.includes(p)
                    ? 'text-white border-transparent shadow-sm'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                style={
                  selectedPlatforms.includes(p)
                    ? {
                        background: 'var(--primary, #3b82f6)',
                        borderColor: 'var(--primary, #3b82f6)',
                      }
                    : {}
                }
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tone + Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as PostTone | '')}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              <option value="">Auto (platform-appropriate)</option>
              {AVAILABLE_TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm bg-white"
            >
              {AVAILABLE_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Additional Context{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--muted, #888)' }}>
              (optional)
            </span>
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            placeholder="Any additional instructions for the AI..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className="px-5 py-2 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: 'var(--primary, #3b82f6)' }}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Posts'
            )}
          </button>
          {result && (
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div
            className="p-3 rounded text-sm"
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── Results ──────────────────────────────────── */}
      {result && result.posts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Generated Posts ({result.posts.length})
            </h2>
            <div className="flex gap-1">
              {result.posts.map((post) => (
                <PlatformBadge key={post.platform} platform={post.platform} />
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {result.posts.map((post, i) => (
              <SocialPostCard key={`${post.platform}-${i}`} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

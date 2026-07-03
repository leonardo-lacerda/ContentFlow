'use client';

import React, { useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface VideoScene {
  sceneNumber: number;
  duration: number;
  headline: string;
  body: string;
  visualNotes: string;
  transition?: string;
  imagePrompt?: string;
}

interface VideoScript {
  title: string;
  totalDuration: number;
  scenes: VideoScene[];
  narration?: string;
  hashtags?: string[];
  caption?: string;
}

const VIDEO_FORMATS = [
  { id: 'reels', name: 'Instagram Reels', maxDuration: 90, aspectRatio: '9:16' },
  { id: 'tiktok', name: 'TikTok', maxDuration: 180, aspectRatio: '9:16' },
  { id: 'shorts', name: 'YouTube Shorts', maxDuration: 60, aspectRatio: '9:16' },
  { id: 'stories', name: 'Instagram Stories', maxDuration: 15, aspectRatio: '9:16' },
];

export function VideoScriptsPage() {
  const fetch = useFetch();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [brandProfileId, setBrandProfileId] = useState('');
  const [carouselProjectId, setCarouselProjectId] = useState('');
  const [format, setFormat] = useState('reels');
  const [maxDuration, setMaxDuration] = useState(90);
  const [additionalContext, setAdditionalContext] = useState('');

  const selectedFormat = VIDEO_FORMATS.find(f => f.id === format);

  const handleFormatChange = (newFormat: string) => {
    setFormat(newFormat);
    const fmt = VIDEO_FORMATS.find(f => f.id === newFormat);
    if (fmt) setMaxDuration(fmt.maxDuration);
  };

  const handleGenerate = async () => {
    if (!brandProfileId || !carouselProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/video-scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandProfileId,
          carouselProjectId,
          format,
          maxDuration,
          additionalContext: additionalContext || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate video script');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title || 'video-script'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNarration = () => {
    if (!result?.narration) return;
    navigator.clipboard.writeText(result.narration);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Video Script Generator</h1>
      <p style={{ color: 'var(--muted, #888)' }}>
        Convert your carousels into engaging short-form video scripts for Reels, TikTok, and Shorts.
      </p>

      <div className="rounded-lg p-6 space-y-4 border" style={{ background: 'var(--card, white)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Brand Profile ID *</label>
            <input
              type="text"
              value={brandProfileId}
              onChange={(e) => setBrandProfileId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Brand profile ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Carousel Project ID *</label>
            <input
              type="text"
              value={carouselProjectId}
              onChange={(e) => setCarouselProjectId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Carousel project ID"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Video Format</label>
            <select
              value={format}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {VIDEO_FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.aspectRatio}, max {f.maxDuration}s)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Max Duration (seconds) — {selectedFormat?.name} max: {selectedFormat?.maxDuration}s
            </label>
            <input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(Number(e.target.value))}
              min={5}
              max={selectedFormat?.maxDuration || 180}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Additional Context (optional)</label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            placeholder="e.g. Focus on the product benefits, use energetic tone..."
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !brandProfileId || !carouselProjectId}
          className="px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--primary, #3b82f6)' }}
        >
          {loading ? 'Generating Script...' : 'Generate Video Script'}
        </button>

        {error && (
          <div
            className="p-3 rounded text-sm"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{result.title}</h2>
              <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
                Total duration: {result.totalDuration}s · {result.scenes.length} scenes
                {selectedFormat && ` · ${selectedFormat.name}`}
              </p>
            </div>
            <div className="flex gap-2">
              {result.narration && (
                <button
                  onClick={handleCopyNarration}
                  className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                >
                  📋 Copy Narration
                </button>
              )}
              <button
                onClick={handleExport}
                className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                📥 Export JSON
              </button>
            </div>
          </div>

          {/* Scenes */}
          <div className="space-y-3">
            <h3 className="font-semibold">Scenes</h3>
            {result.scenes.map((scene) => (
              <div
                key={scene.sceneNumber}
                className="border rounded-lg p-4 space-y-2"
                style={{ background: 'var(--card, white)' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                    style={{ background: 'var(--primary, #3b82f6)', color: 'white' }}
                  >
                    Scene {scene.sceneNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                    {scene.duration}s
                  </span>
                  {scene.transition && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                      → {scene.transition}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm">{scene.headline}</div>
                <p className="text-sm" style={{ color: 'var(--muted, #666)' }}>
                  {scene.body}
                </p>
                <div className="text-xs p-2 rounded" style={{ background: 'var(--muted, #f5f5f5)' }}>
                  <strong>🎬 Visual:</strong> {scene.visualNotes}
                </div>
                {scene.imagePrompt && (
                  <div className="text-xs p-2 rounded" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                    <strong>🖼️ Image Prompt:</strong> {scene.imagePrompt}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Narration */}
          {result.narration && (
            <div className="space-y-2">
              <h3 className="font-semibold">Full Narration</h3>
              <div
                className="border rounded p-4 text-sm whitespace-pre-wrap"
                style={{ background: 'var(--card, white)' }}
              >
                {result.narration}
              </div>
            </div>
          )}

          {/* Caption & Hashtags */}
          {(result.caption || result.hashtags?.length) && (
            <div className="space-y-2">
              <h3 className="font-semibold">Caption & Hashtags</h3>
              <div className="border rounded p-4 space-y-2" style={{ background: 'var(--card, white)' }}>
                {result.caption && <p className="text-sm">{result.caption}</p>}
                {result.hashtags && result.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: '#dbeafe', color: '#1d4ed8' }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

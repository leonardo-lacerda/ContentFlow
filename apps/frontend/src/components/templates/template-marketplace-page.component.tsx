'use client';

import React, { useState, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  source: string;
  version: number;
  tags: string[];
  installCount: number;
  usageCount: number;
  rating: number;
  previewImageUrl?: string;
}

export function TemplateMarketplacePage() {
  const fetch = useFetch();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [installed, setInstalled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    loadTemplates();
    loadInstalled();
  }, [search, category, source]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (source) params.set('source', source);

      const res = await fetch(`/template-marketplace/templates?${params}`);
      if (res.ok) setTemplates(await res.json());
    } catch (e) {
      console.error('Failed to load templates', e);
    } finally {
      setLoading(false);
    }
  };

  const loadInstalled = async () => {
    try {
      const res = await fetch('/template-marketplace/installed');
      if (res.ok) {
        const data = await res.json();
        setInstalled(data.map((i: any) => i.templateId));
      }
    } catch (e) {
      console.error('Failed to load installed', e);
    }
  };

  const handleInstall = async (id: string) => {
    try {
      const res = await fetch(`/template-marketplace/templates/${id}/install`, {
        method: 'POST',
      });
      if (res.ok) {
        setInstalled((prev) => [...prev, id]);
      }
    } catch (e) {
      console.error('Failed to install', e);
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      const res = await fetch(`/template-marketplace/templates/${id}/uninstall`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInstalled((prev) => prev.filter((i) => i !== id));
      }
    } catch (e) {
      console.error('Failed to uninstall', e);
    }
  };

  const categories = ['Todos', 'Educação', 'Negócios', 'Saúde', 'Tecnologia', 'Alimentação', 'Moda', 'Imobiliário'];
  const sources = ['Todos', 'OFFICIAL', 'COMMUNITY'];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace de Templates</h1>
        <p style={{ color: 'var(--muted, #888)' }}>
          Descubra e instale templates criados pela comunidade e pela equipe do ContentFlow.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar templates..."
          className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value === 'Todos' ? '' : e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c === 'Todos' ? '' : c}>{c}</option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value === 'Todos' ? '' : e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          {sources.map((s) => (
            <option key={s} value={s === 'Todos' ? '' : s}>{s === 'Todos' ? 'Todas as fontes' : s}</option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <p style={{ color: 'var(--muted, #888)' }}>Carregando...</p>
      ) : templates.length === 0 ? (
        <div className="text-center p-12 border rounded-lg" style={{ background: 'var(--card, white)' }}>
          <p className="text-lg font-semibold">Nenhum template encontrado</p>
          <p style={{ color: 'var(--muted, #888)' }}>Tente ajustar os filtros ou buscar por outro termo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border rounded-lg p-4 space-y-3"
              style={{ background: 'var(--card, white)' }}
            >
              {template.previewImageUrl && (
                <img
                  src={template.previewImageUrl}
                  alt={template.name}
                  className="w-full h-32 object-cover rounded"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: template.source === 'OFFICIAL' ? '#dbeafe' : '#f3f4f6',
                      color: template.source === 'OFFICIAL' ? '#1d4ed8' : '#6b7280',
                    }}
                  >
                    {template.source}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--muted, #888)' }}>
                  {template.description}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted, #888)' }}>
                <span>v{template.version}</span>
                <span>{template.installCount} instalações</span>
                <span>{template.usageCount} usos</span>
              </div>

              {template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--muted, #f5f5f5)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2">
                {installed.includes(template.id) ? (
                  <button
                    onClick={() => handleUninstall(template.id)}
                    className="w-full px-3 py-2 border rounded text-sm hover:bg-gray-50"
                  >
                    Desinstalar
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(template.id)}
                    className="w-full px-3 py-2 text-white rounded text-sm"
                    style={{ background: 'var(--primary, #3b82f6)' }}
                  >
                    Instalar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

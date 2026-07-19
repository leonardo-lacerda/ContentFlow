'use client';

import React, { useState, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  FormInput,
  FormSelect,
  FilterChip,
} from '@gitroom/frontend/components/new-layout/page-system';

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
      const res = await fetch(
        `/template-marketplace/templates/${id}/uninstall`,
        {
          method: 'DELETE',
        }
      );
      if (res.ok) {
        setInstalled((prev) => prev.filter((x) => x !== id));
      }
    } catch (e) {
      console.error('Failed to uninstall', e);
    }
  };

  const categories = [
    'Todos',
    'Carousel',
    'Social',
    'Email',
    'Ads',
    'Video',
  ];
  const sources = ['Todos', 'OFFICIAL', 'COMMUNITY', 'CUSTOM'];

  return (
    <PageShell>
      <PageHeader
        description="Instale templates oficiais e da comunidade para acelerar a criação de conteúdo."
        filters={
          <div className="flex items-center gap-[8px] flex-wrap">
            <FormInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar templates..."
              className="!w-[200px] !h-[32px] !py-[6px] !text-[12px]"
            />
            <FormSelect
              value={category || 'Todos'}
              onChange={(e) =>
                setCategory(e.target.value === 'Todos' ? '' : e.target.value)
              }
              className="!w-auto !h-[32px] !py-[6px] !text-[12px]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={source || 'Todos'}
              onChange={(e) =>
                setSource(e.target.value === 'Todos' ? '' : e.target.value)
              }
              className="!w-auto !h-[32px] !py-[6px] !text-[12px]"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s === 'Todos' ? 'Todas as fontes' : s}
                </option>
              ))}
            </FormSelect>
          </div>
        }
      />
      <PageBody className={!loading && templates.length === 0 ? '!p-0' : undefined}>
        {loading ? (
          <div className="text-[13px] text-textItemBlur py-[40px] text-center">
            Carregando templates...
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            title="Nenhum template encontrado"
            description="Tente ajustar os filtros ou buscar por outro termo."
            actionLabel="Limpar filtros"
            onAction={() => {
              setSearch('');
              setCategory('');
              setSource('');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[12px]">
            {templates.map((template) => {
              const isInstalled = installed.includes(template.id);
              return (
                <SectionCard
                  key={template.id}
                  className="!p-[14px] flex flex-col gap-[12px]"
                >
                  {template.previewImageUrl ? (
                    <img
                      src={template.previewImageUrl}
                      alt={template.name}
                      className="w-full h-[120px] object-cover rounded-[8px] border border-newTableBorder"
                    />
                  ) : (
                    <div className="w-full h-[80px] rounded-[8px] bg-newBgColorInner border border-newTableBorder flex items-center justify-center text-[12px] text-textItemBlur">
                      Sem preview
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <h3 className="text-[14px] font-[600] text-newTextColor truncate">
                        {template.name}
                      </h3>
                      <FilterChip active={template.source === 'OFFICIAL'}>
                        {template.source}
                      </FilterChip>
                    </div>
                    <p className="text-[12px] text-textItemBlur mt-[6px] line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-[10px] mt-[8px] text-[11px] text-textItemBlur">
                      <span>v{template.version}</span>
                      <span>{template.installCount} instalações</span>
                      <span>{template.usageCount} usos</span>
                    </div>
                    {template.tags?.length ? (
                      <div className="flex flex-wrap gap-[6px] mt-[8px]">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] px-[8px] py-[2px] rounded-[6px] bg-newBgColorInner border border-newTableBorder text-textItemBlur"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {isInstalled ? (
                    <Button
                      secondary
                      className="!h-[36px] !text-[12px] w-full"
                      onClick={() => handleUninstall(template.id)}
                    >
                      Desinstalar
                    </Button>
                  ) : (
                    <Button
                      className="!h-[36px] !text-[12px] w-full"
                      onClick={() => handleInstall(template.id)}
                    >
                      Instalar
                    </Button>
                  )}
                </SectionCard>
              );
            })}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}

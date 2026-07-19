'use client';

import React, { useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  useCreateDrawer,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FilterChip,
} from '@gitroom/frontend/components/new-layout/page-system';
import { SocialPostCard } from './social-post-card.component';
import { ArticleImportPanel } from './article-import-panel.component';
import { useSocialPosts } from './social-posts.hooks';
import type {
  SocialPlatform,
  PostTone,
  GenerateSocialPostsParams,
  GeneratedSocialPost,
} from './social-posts.types';
import {
  AVAILABLE_PLATFORMS,
  AVAILABLE_TONES,
  AVAILABLE_LANGUAGES,
} from './social-posts.types';

function GenerateSocialPostsForm({
  brandId,
  onGenerated,
  onClose,
}: {
  brandId?: string;
  onGenerated: (posts: GeneratedSocialPost[]) => void;
  onClose: () => void;
}) {
  const { generate, generating, error } = useSocialPosts();
  const [topic, setTopic] = useState('');
  const [contentIdeaId, setContentIdeaId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'instagram',
    'linkedin',
  ]);
  const [tone, setTone] = useState<PostTone | ''>('');
  const [language, setLanguage] = useState('pt-BR');
  const [additionalContext, setAdditionalContext] = useState('');

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const canGenerate =
    selectedPlatforms.length > 0 &&
    !!(topic.trim() || contentIdeaId.trim());

  const handleGenerate = async () => {
    if (!canGenerate) return;
    try {
      const params: GenerateSocialPostsParams = {
        brandProfileId: brandId || undefined,
        contentIdeaId: contentIdeaId || undefined,
        topic: topic || undefined,
        platforms: selectedPlatforms,
        tone: tone || undefined,
        language: language || undefined,
        additionalContext: additionalContext || undefined,
      };
      const batch = await generate(params);
      if (batch?.posts?.length) {
        onGenerated(batch.posts);
        onClose();
      }
    } catch {
      // error state handled by hook
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <FormField
        label="Tópico"
        hint="Ou informe o ID de uma content idea abaixo"
      >
        <FormInput
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex.: lançamento do curso de IA para marketers"
        />
      </FormField>

      <FormField label="Content Idea ID" hint="Opcional">
        <FormInput
          value={contentIdeaId}
          onChange={(e) => setContentIdeaId(e.target.value)}
          placeholder="ID da ideia de conteúdo"
        />
      </FormField>

      <div className="flex flex-col gap-[8px]">
        <span className="text-[12px] font-[600] text-newTextColor">
          Plataformas *
        </span>
        <div className="flex flex-wrap gap-[6px]">
          {AVAILABLE_PLATFORMS.map((p) => (
            <FilterChip
              key={p}
              active={selectedPlatforms.includes(p)}
              onClick={() => togglePlatform(p)}
            >
              {p}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[12px]">
        <FormField label="Tom">
          <FormSelect
            value={tone}
            onChange={(e) => setTone(e.target.value as PostTone | '')}
          >
            <option value="">Automático</option>
            {AVAILABLE_TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Idioma">
          <FormSelect
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {AVAILABLE_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
      </div>

      <FormField label="Contexto adicional" hint="Opcional">
        <FormTextarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          rows={3}
          placeholder="Diretrizes extras de voz, CTA, restrições..."
        />
      </FormField>

      {error ? (
        <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px]">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-[8px]">
        <Button secondary onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          loading={generating}
          disabled={!canGenerate}
        >
          Gerar posts
        </Button>
      </div>
    </div>
  );
}

export function SocialPostsPage() {
  const { data: selectedBrand } = useSelectedBrand();
  const brandId = selectedBrand?.id as string | undefined;
  const { openCreateDrawer } = useCreateDrawer();
  const [posts, setPosts] = useState<GeneratedSocialPost[]>([]);
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>(
    'all'
  );

  const openGenerate = () => {
    openCreateDrawer({
      title: 'Gerar social posts',
      size: 560,
      children: (close) => (
        <GenerateSocialPostsForm
          brandId={brandId}
          onClose={close}
          onGenerated={(newPosts) =>
            setPosts((prev) => [...newPosts, ...prev])
          }
        />
      ),
    });
  };

  const filtered =
    platformFilter === 'all'
      ? posts
      : posts.filter((p) => p.platform === platformFilter);

  const platformsInList = Array.from(new Set(posts.map((p) => p.platform)));

  return (
    <PageShell>
      <PageHeader
        description="Gere posts para IG, Facebook, LinkedIn, X e TikTok — ou importe um artigo."
        filters={
          posts.length > 0 ? (
            <div className="flex items-center gap-[6px]">
              <FilterChip
                active={platformFilter === 'all'}
                onClick={() => setPlatformFilter('all')}
              >
                Todos
              </FilterChip>
              {platformsInList.map((p) => (
                <FilterChip
                  key={p}
                  active={platformFilter === p}
                  onClick={() => setPlatformFilter(p)}
                >
                  {p}
                </FilterChip>
              ))}
            </div>
          ) : undefined
        }
        actions={<Button onClick={openGenerate}>Gerar posts</Button>}
      />
      <PageBody>
        <div className="w-full max-w-[880px] mx-auto mb-4">
          <ArticleImportPanel brandId={brandId} />
        </div>
        {!posts.length ? (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H14L9 21V16Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            title="Nenhum post gerado ainda"
            description="Crie posts para Instagram, Facebook, LinkedIn, X ou TikTok — ou importe um artigo acima."
            actionLabel="Gerar posts"
            onAction={openGenerate}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum post neste filtro"
            description="Tente outra plataforma ou gere novos posts."
            actionLabel="Limpar filtro"
            onAction={() => setPlatformFilter('all')}
          />
        ) : (
          <div className="grid gap-[12px]">
            {filtered.map((post, i) => (
              <SectionCard
                key={`${post.platform}-${i}-${post.charCount}`}
                className="!p-[14px]"
              >
                <SocialPostCard post={post} />
              </SectionCard>
            ))}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}

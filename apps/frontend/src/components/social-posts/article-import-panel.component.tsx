'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  SectionCard,
  FormInput,
} from '@gitroom/frontend/components/new-layout/page-system';

/**
 * ContentFlow v1: URL de artigo → carrossel com Brand DNA.
 * POST /article-import { url, brandProfileId, slideCount?, language? }
 */
export function ArticleImportPanel({ brandId }: { brandId?: string }) {
  const fetch = useFetch();
  const toaster = useToaster();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const runImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toaster.show('Cole a URL do artigo', 'warning');
      return;
    }
    if (!brandId) {
      toaster.show('Configure a marca antes de importar', 'warning');
      router.push('/brand');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/article-import', {
        method: 'POST',
        body: JSON.stringify({
          url: trimmed,
          brandProfileId: brandId,
          slideCount: 6,
          language: 'pt-BR',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.msg || data?.message || data?.error || 'Falha ao importar'
        );
      }

      const projectId =
        data.id ||
        data.projectId ||
        data.carouselProjectId ||
        data?.data?.id ||
        data?.data?.projectId;

      toaster.show('Artigo convertido em carrossel', 'success');
      if (projectId) {
        router.push(`/generate?projectId=${projectId}`);
      } else {
        router.push('/generate');
      }
    } catch (err: any) {
      toaster.show(err?.message || 'Erro ao importar artigo', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Importar artigo → carrossel">
      <p className="text-xs text-textItemBlur mb-3">
        Cole a URL de um post ou artigo. A IA extrai o texto e gera um carrossel
        com o DNA da marca.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <FormInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seu-blog.com/artigo"
            disabled={loading}
          />
        </div>
        <Button onClick={runImport} loading={loading} disabled={loading}>
          {loading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Gerando…
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4 mr-2" />
              Importar e gerar
            </>
          )}
        </Button>
      </div>
    </SectionCard>
  );
}

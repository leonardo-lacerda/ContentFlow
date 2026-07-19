'use client';

import { useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { Sparkles } from 'lucide-react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { analyzeBrand } from './brand-dna.service';
import { mutateBrand } from './brand-dna.hooks';

export function AnalyzeSiteButton({
  brandId,
  website,
}: {
  brandId: string;
  website?: string;
}) {
  const [url, setUrl] = useState(website || '');
  const [loading, setLoading] = useState(false);
  const toaster = useToaster();

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toaster.show('Por favor, informe uma URL', 'warning');
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeBrand(brandId, url.trim());
      if (result.success) {
        toaster.show('Análise concluída! Revise os dados extraídos.', 'success');
        mutateBrand(brandId);
      } else {
        toaster.show(
          result.errors?.join(', ') || 'Falha na análise',
          'warning'
        );
      }
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao analisar site', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://exemplo.com"
        className="h-[42px] w-[320px] rounded-[10px] border border-newTableBorder bg-newSettings px-4 text-[14px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-newTextColor"
        disabled={loading}
      />
      <Button onClick={handleAnalyze} loading={loading} disabled={loading}>
        <Sparkles className="w-4 h-4" />
        {loading ? 'Analisando...' : 'Analisar Site'}
      </Button>
    </div>
  );
}

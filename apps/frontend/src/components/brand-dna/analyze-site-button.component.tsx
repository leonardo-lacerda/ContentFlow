'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { Sparkles } from 'lucide-react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { analyzeBrand, getBrand, getLatestDna } from './brand-dna.service';
import { mutateBrand } from './brand-dna.hooks';

// The analysis now runs in the background (site fetch + LLM can take well over
// a minute — longer than the reverse proxy will hold a request open). The
// endpoint returns immediately with status ANALYZING; we poll the latest DNA
// until it appears (success) or we give up. ~2s * 60 = up to ~2 min of patience.
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 60;

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Stop polling if the component unmounts mid-analysis.
  useEffect(() => clearPoll, []);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toaster.show('Por favor, informe uma URL', 'warning');
      return;
    }

    setLoading(true);
    clearPoll();
    try {
      const result = await analyzeBrand(brandId, url.trim());
      // A synchronous failure (plan limit, invalid URL) comes back right away.
      if (result && result.success === false) {
        toaster.show(result.errors?.join(', ') || 'Falha na análise', 'warning');
        setLoading(false);
        return;
      }
      toaster.show('Análise iniciada… extraindo o Brand DNA (pode levar até ~1 min).', 'success');
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        try {
          // Check the brand's own status first: a FAILED result is terminal
          // and should surface immediately (with the real reason) instead of
          // silently polling until the generic timeout message, which used to
          // be the only thing a fast, real failure ever showed the user.
          const brand = await getBrand(brandId);
          if (brand?.status === 'FAILED') {
            clearPoll();
            setLoading(false);
            mutateBrand(brandId);
            toaster.show(
              brand.lastAnalysisError
                ? `Falha na análise: ${brand.lastAnalysisError}`
                : 'A análise falhou.',
              'warning'
            );
            return;
          }
          const dna = await getLatestDna(brandId);
          if (dna?.summary) {
            clearPoll();
            setLoading(false);
            mutateBrand(brandId);
            toaster.show('Análise concluída! Revise os dados extraídos.', 'success');
          } else if (attempts >= POLL_MAX_ATTEMPTS) {
            clearPoll();
            setLoading(false);
            mutateBrand(brandId);
            toaster.show(
              'A análise está demorando mais que o esperado. Ela continua rodando — atualize a página em instantes.',
              'warning'
            );
          }
        } catch {
          // transient read error — keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      clearPoll();
      setLoading(false);
      toaster.show(err.message || 'Erro ao analisar site', 'warning');
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

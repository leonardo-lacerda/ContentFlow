'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { createBrand, selectBrand, analyzeBrand, getLatestDna } from '@gitroom/frontend/components/brand-dna/brand-dna.service';
import {
  Loader,
  Building2,
  Globe,
  Search,
  CheckCircle,
  Lightbulb,
  Play,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { BrandDnaSnapshot } from '@gitroom/frontend/components/brand-dna/brand-dna.types';
import { loadVars } from '@gitroom/react/helpers/variable.context';

const inputClass =
  'h-[48px] w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';

const industryOptions = [
  'SaaS B2B',
  'E-commerce',
  'Educacao',
  'Saude e bem-estar',
  'Financas',
  'Agencia / Marketing',
  'Industria',
  'Servicos locais',
  'Imobiliario',
  'Alimentacao',
  'Moda e beleza',
  'Tecnologia',
];

const STEPS = [
  { id: 'create', label: 'Criar Marca', icon: Building2 },
  { id: 'analyze', label: 'Analisar Site', icon: Search },
  { id: 'dna', label: 'Revisar DNA', icon: Sparkles },
  { id: 'ideas', label: 'Gerar Ideias', icon: Lightbulb },
  { id: 'carousel', label: 'Primeiro Carrossel', icon: Play },
];

interface GeneratedIdea {
  title: string;
  hook: string;
  goal: string;
  angle: string;
  templateSuggestion?: string;
  platformSuggestion?: string;
  score?: number;
}

function api(path: string, options?: RequestInit) {
  const { backendUrl } = loadVars();
  return fetch(backendUrl + path, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export function OnboardingWizard() {
  const router = useRouter();
  const toaster = useToaster();

  // Wizard state
  const [step, setStep] = useState(0);
  const [brandName, setBrandName] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [brandIndustry, setBrandIndustry] = useState('');
  const [brandId, setBrandId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dna, setDna] = useState<BrandDnaSnapshot | null>(null);
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [persistedIdeaIds, setPersistedIdeaIds] = useState<string[]>([]);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── Step 0: Create Brand ────────────────────────────────────────────
  const handleCreateBrand = async () => {
    if (!brandName.trim()) {
      toaster.show('O nome da marca e obrigatorio', 'warning');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const brand = await createBrand({
        name: brandName.trim(),
        website: brandWebsite.trim() || undefined,
        industry: brandIndustry || undefined,
      });
      await selectBrand(brand.id);
      setBrandId(brand.id);
      setStep(1);
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao criar marca', 'warning');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 1: Analyze Site ────────────────────────────────────────────
  const startAnalysis = useCallback(async () => {
    if (!brandId) return;
    if (!brandWebsite.trim()) {
      // No website — skip to manual DNA
      setStep(2);
      return;
    }

    setAnalyzing(true);
    setError('');
    try {
      await analyzeBrand(brandId, brandWebsite.trim());
      // Start polling for DNA
      pollRef.current = setInterval(async () => {
        try {
          const latest = await getLatestDna(brandId);
          const snapshot = latest?.data || latest;
          if (snapshot && snapshot.id) {
            if (pollRef.current) clearInterval(pollRef.current);
            setDna(snapshot);
            setAnalyzing(false);
            setStep(2);
          }
        } catch {
          // Keep polling — DNS might still be processing
        }
      }, 3000);
    } catch (err: any) {
      setAnalyzing(false);
      setError(err.message || 'Erro ao analisar site');
    }
  }, [brandId, brandWebsite]);

  useEffect(() => {
    if (step === 1 && brandId) {
      startAnalysis();
    }
  }, [step, brandId, startAnalysis]);

  // ─── Step 3: Generate Ideas ──────────────────────────────────────────
  const handleGenerateIdeas = async () => {
    if (!brandId) return;
    setLoading(true);
    setError('');
    try {
      const { backendUrl } = loadVars();
      // Generate ideas via AI
      const res = await api('/ai-generate/carousel-ideas', {
        method: 'POST',
        body: JSON.stringify({
          brandProfileId: brandId,
          companyContext: dna?.summary?.description || brandName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao gerar ideias');

      const generatedIdeas: GeneratedIdea[] = data.ideas || data.data?.ideas || [];
      if (generatedIdeas.length === 0) {
        throw new Error('Nenhuma ideia foi gerada. Tente novamente.');
      }

      // Persist each idea
      const ids: string[] = [];
      for (const idea of generatedIdeas) {
        const ideaRes = await api('/content-ideas', {
          method: 'POST',
          body: JSON.stringify({
            brandProfileId: brandId,
            title: idea.title,
            hook: idea.hook,
            goal: idea.goal,
            angle: idea.angle,
            templateSuggestion: idea.templateSuggestion,
            platformSuggestion: idea.platformSuggestion,
            score: idea.score,
          }),
        });
        const ideaData = await ideaRes.json();
        if (ideaRes.ok && ideaData.id) {
          ids.push(ideaData.id);
        }
      }

      setIdeas(generatedIdeas);
      setPersistedIdeaIds(ids);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar ideias');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 4: Create First Carousel ───────────────────────────────────
  const handleCreateCarousel = async () => {
    if (selectedIdeaIndex === null || !persistedIdeaIds[selectedIdeaIndex]) return;
    setLoading(true);
    setError('');
    try {
      const ideaId = persistedIdeaIds[selectedIdeaIndex];
      const res = await api(`/carousel-projects/from-idea/${ideaId}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao criar carrossel');
      }
      toaster.show('Primeiro carrossel criado!', 'success');
      router.push('/ai-generate-images');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar carrossel');
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isDone = i < step;
          const isCurrent = i === step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition ${
                  isCurrent
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    : isDone
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 ${
                    isDone ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-[10px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Step 0: Create Brand */}
      {step === 0 && (
        <div className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Crie sua marca</h2>
            <p className="text-sm text-gray-500">
              Comece informando o nome e o site da sua marca. Vamos analisar automaticamente para gerar o Brand DNA.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[14px] font-[500]">
                Nome da marca <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                placeholder="Ex: Minha Empresa"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-[6px]">
              <label className="text-[14px] font-[500]">Website</label>
              <input
                className={inputClass}
                placeholder="https://exemplo.com"
                value={brandWebsite}
                onChange={(e) => setBrandWebsite(e.target.value)}
              />
              <span className="text-xs text-gray-400">
                Se informado, vamos analisar o site para extrair o Brand DNA automaticamente.
              </span>
            </div>

            <div className="flex flex-col gap-[6px]">
              <label className="text-[14px] font-[500]">Industria</label>
              <select
                className={inputClass}
                value={brandIndustry}
                onChange={(e) => setBrandIndustry(e.target.value)}
              >
                <option value="">Selecione...</option>
                {industryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCreateBrand} loading={loading}>
              Criar Marca
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Analyze Site */}
      {step === 1 && (
        <div className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Analisando o site</h2>
            <p className="text-sm text-gray-500">
              Estamos analisando <span className="font-medium">{brandWebsite}</span> para extrair o Brand DNA.
            </p>
          </div>

          {analyzing && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Extraindo informacoes do site...</p>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          )}

          {!analyzing && !dna && brandWebsite && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Button onClick={startAnalysis}>
                <Search className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          )}

          {!brandWebsite && !analyzing && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Globe className="w-12 h-12 text-gray-300" />
              <p className="text-sm text-gray-500">Nenhum site informado</p>
              <p className="text-xs text-gray-400">Voce podera preencher o DNA manualmente no proximo passo.</p>
              <Button onClick={() => setStep(2)}>
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review DNA */}
      {step === 2 && (
        <div className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Brand DNA</h2>
            <p className="text-sm text-gray-500">
              {dna
                ? 'Confira as informacoes extraidas. Voce podera editar depois na pagina da marca.'
                : 'Nenhum DNA foi gerado automaticamente. Voce podera criar um manualmente na pagina da marca.'}
            </p>
          </div>

          {dna && (
            <div className="space-y-4">
              <DnaSection title="Resumo">
                <DnaField label="Tagline" value={dna.summary?.tagline} />
                <DnaField label="Descricao" value={dna.summary?.description} />
                <DnaField label="Industria" value={dna.summary?.industry} />
                <DnaField label="Publico-alvo" value={dna.summary?.targetAudience} />
              </DnaSection>

              <DnaSection title="Voz da Marca">
                <DnaField label="Tom" value={dna.voice?.tone} />
                <DnaField label="Estilo" value={dna.voice?.style} />
                <DnaField label="Personalidade" value={dna.voice?.personality} />
                <DnaListField label="Palavras proibidas" items={dna.voice?.forbiddenWords} />
              </DnaSection>

              <DnaSection title="Publico">
                <DnaField label="Demografia" value={dna.audience?.demographics} />
                <DnaListField label="Dores" items={dna.audience?.painPoints} />
                <DnaListField label="Desejos" items={dna.audience?.desires} />
                <DnaListField label="Objecoes" items={dna.audience?.objections} />
              </DnaSection>

              <DnaSection title="Oferta">
                <DnaListField label="Produtos" items={dna.offer?.products} />
                <DnaListField label="Servicos" items={dna.offer?.services} />
                <DnaListField label="Diferenciais" items={dna.offer?.uniqueSellingPoints} />
                <DnaField label="Sugestao de preco" value={dna.offer?.pricingHint} />
              </DnaSection>

              <DnaSection title="Identidade Visual">
                <DnaListField label="Cores" items={dna.visual?.colors} />
                <DnaField label="Estilo" value={dna.visual?.style} />
                <DnaField label="Tipografia" value={dna.visual?.typographyHint} />
              </DnaSection>

              <DnaSection title="Diretrizes">
                <DnaListField label="Fazer" items={dna.constraints?.do} />
                <DnaListField label="Evitar" items={dna.constraints?.avoid} />
                <DnaListField label="Elementos obrigatorios" items={dna.constraints?.requiredElements} />
              </DnaSection>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-black/10 dark:border-white/10">
            <Button onClick={() => setStep(0)} secondary>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => setStep(3)}>
              Gerar Ideias
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generate Ideas */}
      {step === 3 && (
        <div className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ideias de Carrossel</h2>
            <p className="text-sm text-gray-500">
              {ideas.length === 0
                ? 'Vamos gerar ideias de carrossel baseadas no Brand DNA da sua marca.'
                : `${ideas.length} ideias geradas. Selecione uma para criar o primeiro carrossel.`}
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader className="w-12 h-12 animate-spin text-purple-500" />
              <p className="text-sm text-gray-500">Gerando ideias de carrossel...</p>
            </div>
          )}

          {!loading && ideas.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Lightbulb className="w-12 h-12 text-gray-300" />
              <Button onClick={handleGenerateIdeas}>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Ideias
              </Button>
            </div>
          )}

          {!loading && ideas.length > 0 && (
            <div className="space-y-3">
              {ideas.map((idea, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIdeaIndex(index)}
                  className={`w-full text-left p-4 rounded-[10px] border transition ${
                    selectedIdeaIndex === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] hover:border-black/20 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-black dark:text-white">{idea.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{idea.hook}</p>
                    </div>
                    {idea.score != null && (
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 ml-4">
                        {idea.score}/10
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {idea.templateSuggestion && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {idea.templateSuggestion}
                      </span>
                    )}
                    {idea.platformSuggestion && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {idea.platformSuggestion}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-black/10 dark:border-white/10">
            <Button onClick={() => setStep(2)} secondary>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            {selectedIdeaIndex !== null && (
              <Button onClick={() => setStep(4)}>
                Criar Primeiro Carrossel
                <Play className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 4: First Carousel */}
      {step === 4 && (
        <div className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Criando seu primeiro carrossel</h2>
            <p className="text-sm text-gray-500">
              Estamos criando um carrossel baseado na ideia selecionada.
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader className="w-12 h-12 animate-spin text-green-500" />
              <p className="text-sm text-gray-500">Criando carrossel...</p>
            </div>
          )}

          {!loading && (
            <div className="flex flex-col items-center py-12 gap-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-sm text-gray-500">Pronto! Redirecionando para o estudio...</p>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-black/10 dark:border-white/10">
            <Button onClick={() => setStep(3)} secondary>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleCreateCarousel} loading={loading}>
              <Play className="w-4 h-4 mr-2" />
              Gerar Carrossel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper sub-components ───────────────────────────────────────────

function DnaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-[10px] border border-black/5 dark:border-white/5 bg-gray-50 dark:bg-gray-900/50">
      <h3 className="text-sm font-semibold mb-3 text-black dark:text-white">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DnaField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}:</span>
      <p className="text-sm text-black dark:text-white">{value}</p>
    </div>
  );
}

function DnaListField({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className="text-xs font-medium text-gray-500">{label}:</span>
      <p className="text-sm text-black dark:text-white">{items.join(', ')}</p>
    </div>
  );
}

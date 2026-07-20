'use client';

import { useDnaSnapshots } from './brand-dna.hooks';
import { BrandDnaSnapshot } from './brand-dna.types';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/react/form/button';
import { Eye, Clock, FileText, Layers } from 'lucide-react';
import clsx from 'clsx';

function SnapshotModalView({
  snapshot,
  close,
}: {
  snapshot: BrandDnaSnapshot;
  close: () => void;
}) {
  const { summary, voice, audience, offer, visual, constraints, confidence, messaging, contentGuidelines } =
    snapshot;

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-6">
      <h3 className="text-[16px] font-semibold mb-2 text-newTextColor">
        {title}
      </h3>
      <div className="text-[14px] text-black/70 dark:text-white/70 leading-relaxed">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="mb-1.5">
      <span className="font-medium text-textItemBlur">
        {label}:{' '}
      </span>
      {value}
    </div>
  );

  const ListField = ({
    label,
    items,
  }: {
    label: string;
    items?: string[];
  }) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-1.5">
        <span className="font-medium text-textItemBlur">
          {label}:{' '}
        </span>
        {items.join(', ')}
      </div>
    );
  };

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2">
      <Section title="Resumo">
        <Field label="Tagline" value={summary.tagline} />
        <Field label="Descrição" value={summary.description} />
        <Field label="Indústria" value={summary.industry} />
        <Field label="Público-alvo" value={summary.targetAudience} />
      </Section>

      <Section title="Voz da Marca">
        <Field label="Tom" value={voice.tone} />
        <Field label="Estilo" value={voice.style} />
        <Field label="Personalidade" value={voice.personality} />
        <ListField label="Palavras proibidas" items={voice.forbiddenWords} />
      </Section>

      <Section title="Público">
        <Field label="Demografia" value={audience.demographics} />
        <ListField label="Dores" items={audience.painPoints} />
        <ListField label="Desejos" items={audience.desires} />
        <ListField label="Objeções" items={audience.objections} />
      </Section>

      <Section title="Oferta">
        <ListField label="Produtos" items={offer.products} />
        <ListField label="Serviços" items={offer.services} />
        <ListField
          label="Diferenciais"
          items={offer.uniqueSellingPoints}
        />
        {offer.pricingHint && (
          <Field label="Sugestão de preço" value={offer.pricingHint} />
        )}
      </Section>

      <Section title="Identidade Visual">
        <ListField label="Cores" items={visual.colors} />
        <Field label="Estilo" value={visual.style} />
        {visual.typographyHint && (
          <Field label="Dica tipográfica" value={visual.typographyHint} />
        )}
      </Section>

      <Section title="Diretrizes">
        <ListField label="Fazer" items={constraints.do} />
        <ListField label="Evitar" items={constraints.avoid} />
        <ListField
          label="Elementos obrigatórios"
          items={constraints.requiredElements}
        />
      </Section>

      {/* Messaging */}
      {messaging && (messaging.brandValues?.length > 0 || messaging.brandStory || messaging.messagingPillars?.length > 0 || messaging.keyCTAs?.length > 0) && (
        <Section title="Comunicação da Marca">
          <ListField label="Valores da marca" items={messaging.brandValues} />
          {messaging.brandStory && <div className="mb-1.5 italic">&ldquo;{messaging.brandStory}&rdquo;</div>}
          <ListField label="Pilares de comunicação" items={messaging.messagingPillars} />
          <ListField label="Chamadas para ação" items={messaging.keyCTAs} />
          <ListField label="Gatilhos emocionais" items={messaging.emotionalTriggers} />
        </Section>
      )}

      {/* Competitors */}
      {messaging?.competitors && messaging.competitors.length > 0 && (
        <Section title="Concorrentes Identificados">
          <ListField label="" items={messaging.competitors} />
        </Section>
      )}

      {/* Content Guidelines */}
      {contentGuidelines && (contentGuidelines.postLengthHint || contentGuidelines.emojiUsage || contentGuidelines.hashtagStrategy?.length > 0 || contentGuidelines.contentMix?.length > 0 || contentGuidelines.bestPractices?.length > 0) && (
        <Section title="Diretrizes de Conteúdo">
          {contentGuidelines.postLengthHint && <Field label="Tamanho dos posts" value={contentGuidelines.postLengthHint} />}
          {contentGuidelines.emojiUsage && <Field label="Uso de emojis" value={contentGuidelines.emojiUsage} />}
          <ListField label="Estratégia de hashtags" items={contentGuidelines.hashtagStrategy} />
          <ListField label="Mix de conteúdo" items={contentGuidelines.contentMix} />
          <ListField label="Melhores práticas" items={contentGuidelines.bestPractices} />
        </Section>
      )}

      {confidence && (
        <Section title="Confiança">
          <Field label="Geral" value={`${(confidence.overall * 100).toFixed(0)}%`} />
          <Field
            label="Textual"
            value={`${(confidence.textual * 100).toFixed(0)}%`}
          />
          <Field
            label="Visual"
            value={`${(confidence.visual * 100).toFixed(0)}%`}
          />
          <Field
            label="Comercial"
            value={`${(confidence.commercial * 100).toFixed(0)}%`}
          />
        </Section>
      )}

      <div className="flex justify-end mt-6 pt-4 border-t border-newTableBorder">
        <Button onClick={close}>Fechar</Button>
      </div>
    </div>
  );
}

export function DnaSnapshotList({ brandId }: { brandId: string }) {
  const { data: snapshots, isLoading, error } = useDnaSnapshots(brandId);
  const modals = useModals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-textItemBlur">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        Carregando snapshots...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 py-4 text-center text-sm">
        Erro ao carregar snapshots: {error.message}
      </div>
    );
  }

  const list: BrandDnaSnapshot[] = Array.isArray(snapshots)
    ? snapshots
    : snapshots?.data || [];

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-textItemBlur">
        <FileText className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">
          Nenhuma análise encontrada.
        </p>
        <p className="text-xs mt-1">
          Analise o site da marca para gerar o Brand DNA.
        </p>
      </div>
    );
  }

  const latestVersion = Math.max(...list.map((s) => s.version));

  const openSnapshot = (snapshot: BrandDnaSnapshot) => {
    modals.openModal({
      title: `Brand DNA v${snapshot.version}`,
      size: 700,
      maxSize: '90vw',
      children: (close: () => void) => (
        <SnapshotModalView snapshot={snapshot} close={close} />
      ),
    });
  };

  return (
    <div className="space-y-3">
      {list
        .sort((a, b) => b.version - a.version)
        .map((snapshot) => {
          const isLatest = snapshot.version === latestVersion;
          return (
            <div
              key={snapshot.id}
              className={clsx(
                'flex items-center gap-4 p-4 rounded-[10px] border transition-all',
                isLatest
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-newSettings border-newTableBorder'
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-newBgColorInner shrink-0">
                <Layers className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-newTextColor">
                    v{snapshot.version}
                  </span>
                  {isLatest && (
                    <span className="text-[11px] bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full font-medium">
                      Atual
                    </span>
                  )}
                </div>
                <div className="text-xs text-textItemBlur mt-0.5 flex items-center gap-3">
                  <span>
                    {new Date(snapshot.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="capitalize">{snapshot.sourceType}</span>
                  <span>{snapshot.model}</span>
                </div>
              </div>

              <Button
                onClick={() => openSnapshot(snapshot)}
                className="shrink-0"
              >
                <Eye className="w-4 h-4" />
                Visualizar
              </Button>
            </div>
          );
        })}
    </div>
  );
}

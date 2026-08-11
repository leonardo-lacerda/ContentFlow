'use client';

import { useEffect, useMemo, useState } from 'react';

export type CreationType = 'image' | 'video' | 'carousel' | 'text';

type Choice = {
  value: string;
  label: string;
  hint?: string;
};

type CreationOptions = {
  platform: string;
  aspectRatio: string;
  tone: string;
  style: string;
  durationSec?: number;
  slideCount?: number;
  length?: string;
};

type CreationOptionsCardProps = {
  args: Record<string, any>;
  status: string;
  respond?: (value: any) => void;
};

const platformChoices: Choice[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'meta-ads', label: 'Anúncio Meta' },
];

const imageRatios: Choice[] = [
  { value: '1:1', label: '1:1', hint: 'Quadrado' },
  { value: '4:5', label: '4:5', hint: 'Feed' },
  { value: '3:4', label: '3:4', hint: 'Retrato' },
  { value: '9:16', label: '9:16', hint: 'Story' },
];

const videoRatios: Choice[] = [
  { value: '9:16', label: '9:16', hint: 'Vertical' },
  { value: '1:1', label: '1:1', hint: 'Quadrado' },
  { value: '16:9', label: '16:9', hint: 'Horizontal' },
];

const tones: Choice[] = [
  { value: 'direto', label: 'Direto' },
  { value: 'premium', label: 'Premium' },
  { value: 'educativo', label: 'Educativo' },
  { value: 'inspirador', label: 'Inspirador' },
];

const visualStyles: Choice[] = [
  { value: 'minimalista', label: 'Minimalista' },
  { value: 'fotografico', label: 'Fotográfico' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'vibrante', label: 'Vibrante' },
];

const videoDurations: Choice[] = [
  { value: '15', label: '15s' },
  { value: '30', label: '30s' },
  { value: '60', label: '60s' },
];

const slideCounts: Choice[] = [
  { value: '5', label: '5 slides' },
  { value: '7', label: '7 slides' },
  { value: '10', label: '10 slides' },
];

const textLengths: Choice[] = [
  { value: 'curto', label: 'Curto', hint: 'Uma ideia rápida' },
  { value: 'medio', label: 'Médio', hint: 'Conteúdo completo' },
  { value: 'longo', label: 'Longo', hint: 'Mais contexto' },
];

const typeLabels: Record<CreationType, string> = {
  image: 'imagem',
  video: 'vídeo',
  carousel: 'carrossel',
  text: 'conteúdo',
};

const normalize = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]/g, '-');

const matchChoice = (value: unknown, choices: Choice[], fallback: string) => {
  const normalized = normalize(value);
  return choices.find((choice) => normalize(choice.value) === normalized || normalize(choice.label) === normalized)?.value || fallback;
};

const getInitialOptions = (type: CreationType, args: Record<string, any>): CreationOptions => {
  const platforms = platformChoices;
  const ratios = type === 'video' ? videoRatios : imageRatios;
  const defaults: CreationOptions = {
    platform: matchChoice(args.suggestedPlatform, platforms, type === 'video' ? 'instagram' : 'instagram'),
    aspectRatio: matchChoice(args.suggestedAspectRatio, ratios, type === 'video' ? '9:16' : type === 'carousel' ? '4:5' : '4:5'),
    tone: matchChoice(args.suggestedTone, tones, 'direto'),
    style: matchChoice(args.suggestedStyle, visualStyles, 'minimalista'),
    durationSec: Number(args.suggestedDurationSec) || 30,
    slideCount: Number(args.suggestedSlideCount) || 7,
    length: matchChoice(args.suggestedLength, textLengths, 'medio'),
  };
  return defaults;
};

function ChoiceGroup({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="cf-creation-options__group">
      <legend>{label}</legend>
      <div className="cf-creation-options__choices">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            className={value === choice.value ? 'is-selected' : ''}
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
          >
            <strong>{choice.label}</strong>
            {choice.hint && <small>{choice.hint}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CreationOptionsCard({
  args,
  status,
  respond,
}: CreationOptionsCardProps) {
  const type = (args.creationType || 'image') as CreationType;
  const initialOptions = useMemo(() => getInitialOptions(type, args), [type, args]);
  const [options, setOptions] = useState<CreationOptions>(initialOptions);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  // "executing" is the status CopilotKit uses while this card is waiting for
  // the user's click (that's when `respond` is handed to it) — it is not a
  // "busy" signal. Lock the buttons once the user already submitted instead.
  const isExecuting = submitting;
  const title = args.title || `Vamos configurar seu ${typeLabels[type]}`;
  const brief = args.brief || 'Escolha só o essencial. Você poderá refinar o resultado conversando depois.';
  const ratios = type === 'video' ? videoRatios : imageRatios;

  const update = (key: keyof CreationOptions, value: string) => {
    setOptions((current) => ({
      ...current,
      [key]: key === 'durationSec' || key === 'slideCount' ? Number(value) : value,
    }));
  };

  const confirm = () => {
    setSubmitting(true);
    respond?.({
      confirmed: true,
      creationType: type,
      options,
      brief: args.brief || '',
    });
  };

  const cancel = () => {
    setSubmitting(true);
    respond?.({ confirmed: false, cancelled: true });
  };

  return (
    <section className="cf-creation-options" aria-label="Opções da criação">
      <div className="cf-creation-options__header">
        <div>
          <span className="cf-creation-options__eyebrow">
            <span aria-hidden="true" /> Configuração rápida
          </span>
          <h3>{title}</h3>
          <p>{brief}</p>
        </div>
        <span className="cf-creation-options__type">{typeLabels[type]}</span>
      </div>

      <div className="cf-creation-options__body">
        <ChoiceGroup
          label="Onde você vai usar?"
          choices={platformChoices}
          value={options.platform}
          onChange={(value) => update('platform', value)}
        />

        <ChoiceGroup
          label={type === 'text' ? 'Tom da mensagem' : 'Formato'}
          choices={type === 'text' ? textLengths : ratios}
          value={type === 'text' ? options.length || 'medio' : options.aspectRatio}
          onChange={(value) => update(type === 'text' ? 'length' : 'aspectRatio', value)}
        />

        {type !== 'text' && (
          <ChoiceGroup
            label="Tom da mensagem"
            choices={tones}
            value={options.tone}
            onChange={(value) => update('tone', value)}
          />
        )}

        {type === 'image' && (
          <ChoiceGroup
            label="Estilo visual"
            choices={visualStyles}
            value={options.style}
            onChange={(value) => update('style', value)}
          />
        )}

        {type === 'video' && (
          <ChoiceGroup
            label="Duração"
            choices={videoDurations}
            value={String(options.durationSec)}
            onChange={(value) => update('durationSec', value)}
          />
        )}

        {type === 'carousel' && (
          <ChoiceGroup
            label="Quantidade"
            choices={slideCounts}
            value={String(options.slideCount)}
            onChange={(value) => update('slideCount', value)}
          />
        )}
      </div>

      <div className="cf-creation-options__footer">
        <span>Você poderá pedir ajustes depois da primeira versão.</span>
        <div>
          <button
            type="button"
            className="cf-creation-options__cancel"
            onClick={cancel}
            disabled={isExecuting || !respond}
          >
            Voltar ao chat
          </button>
          <button
            type="button"
            className="cf-creation-options__confirm"
            onClick={confirm}
            disabled={isExecuting || !respond}
          >
            {isExecuting ? 'Salvando escolhas…' : 'Continuar com essas opções'}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from 'react';
import { Package, PenTool, Shapes, Smartphone, Sparkles, Type, Users } from 'lucide-react';
import type { DirectionAxisOption } from './ai-generate-images.presets';
import {
  brandIntensityPresets,
  compositionPresets,
  densityPresets,
  editorialPresets,
  hierarchyPresets,
  imageryPresets,
} from './ai-generate-images.presets';
import type { EditorialReview } from './ai-generate-images.types';
import type {
  DirectionAxisKey,
  DirectionSpec,
} from './direction-compiler';
import { summarizeDirection } from './direction-compiler';

// ---------------------------------------------------------------------------
// Mini-prévias animadas: cada opção mostra um "slide" em miniatura ilustrando
// o conceito (composição, densidade, hierarquia, etc.), para a pessoa entender
// visualmente sem precisar conhecer jargão.
// ---------------------------------------------------------------------------

// Barra (linha de texto) e bloco (imagem) usam bg-current → herdam a cor do
// cartão (branco quando ativo, escuro quando inativo).
const Bar = ({ className = '' }: { className?: string }) => (
  <span className={`block rounded-full bg-current ${className}`} />
);
const Block = ({ className = '' }: { className?: string }) => (
  <span className={`block rounded-[3px] bg-current ${className}`} />
);

function GlyphFrame({ children }: { children: ReactNode }) {
  return (
    <span className="dir-glyph mb-[8px] flex aspect-[5/3] w-full items-stretch overflow-hidden rounded-[8px] border border-current/15 bg-current/[0.06] p-[7px]">
      {children}
    </span>
  );
}

const imageryIcons: Record<string, typeof Type> = {
  none: Type,
  icons: Shapes,
  illustration: PenTool,
  people: Users,
  product: Package,
  mockups: Smartphone,
  'ai-free': Sparkles,
};

// Tratamentos de "estilo editorial": cor de fundo + barras que evocam o clima.
const editorialGlyphs: Record<string, { bg: string; fg: string; accent?: string }> = {
  'editorial-premium': { bg: '#f7f2ea', fg: '#1c1917' },
  'corporativo-moderno': { bg: '#ffffff', fg: '#1c2b46', accent: '#2563eb' },
  'tech-futurista': { bg: '#0e1116', fg: '#9fb4c9', accent: '#22d3ee' },
  minimalista: { bg: '#ffffff', fg: '#1c1917' },
  luxo: { bg: '#14110c', fg: '#e7d9b8', accent: '#c9a227' },
  bold: { bg: '#ffffff', fg: '#111111' },
  clean: { bg: '#fafafa', fg: '#3a3a3a' },
  revista: { bg: '#ffffff', fg: '#1c1917' },
  startup: { bg: '#ffffff', fg: '#1c1917', accent: '#7c3aed' },
  institucional: { bg: '#eef0f2', fg: '#33415c' },
};

function AxisGlyph({
  axisKey,
  optionId,
  active,
}: {
  axisKey: DirectionAxisKey;
  optionId: string;
  active: boolean;
}) {
  const glyphClass = `dir-glyph-inner text-current transition-transform duration-300 group-hover:scale-[1.06] ${
    active ? 'dir-glyph-active' : ''
  }`;

  if (axisKey === 'editorial') {
    const treatment = editorialGlyphs[optionId] || editorialGlyphs.minimalista;
    return (
      <span
        className="dir-glyph mb-[8px] flex aspect-[5/3] w-full flex-col justify-center gap-[5px] overflow-hidden rounded-[8px] border border-black/10 p-[10px] transition-transform duration-300 group-hover:scale-[1.06]"
        style={{ background: treatment.bg, color: treatment.fg }}
      >
        {optionId === 'bold' ? (
          <span className="block h-[10px] w-[70%] rounded-[2px] bg-current" />
        ) : optionId === 'revista' ? (
          <span className="flex gap-[4px]">
            <span className="block h-[18px] w-1/2 rounded-[2px] bg-current opacity-80" />
            <span className="flex w-1/2 flex-col gap-[3px]">
              <span className="block h-[3px] w-full rounded-full bg-current opacity-50" />
              <span className="block h-[3px] w-full rounded-full bg-current opacity-50" />
              <span className="block h-[3px] w-2/3 rounded-full bg-current opacity-50" />
            </span>
          </span>
        ) : (
          <>
            <span className="block h-[5px] w-[80%] rounded-full bg-current" />
            <span className="block h-[3px] w-[55%] rounded-full bg-current opacity-50" />
          </>
        )}
        {treatment.accent && (
          <span
            className="block h-[4px] w-[28%] rounded-full"
            style={{ background: treatment.accent }}
          />
        )}
      </span>
    );
  }

  if (axisKey === 'imagery') {
    const Icon = imageryIcons[optionId] || Sparkles;
    // "Sem imagens": mini-slide só com texto.
    if (optionId === 'none') {
      return (
        <GlyphFrame>
          <span className={`flex w-full flex-col justify-center gap-[4px] ${glyphClass}`}>
            <Bar className="h-[5px] w-[85%]" />
            <Bar className="h-[4px] w-[65%] opacity-50" />
            <Bar className="h-[4px] w-[45%] opacity-50" />
          </span>
        </GlyphFrame>
      );
    }
    // Demais: bloco de imagem (com o ícone do tipo) ao lado do texto.
    const tall = optionId === 'mockups';
    return (
      <GlyphFrame>
        <span className={`flex w-full items-center gap-[7px] ${glyphClass}`}>
          <span
            className={`flex shrink-0 items-center justify-center rounded-[5px] border border-current/30 bg-current/10 ${
              tall ? 'h-[34px] w-[22px]' : 'h-[30px] w-[30px]'
            }`}
          >
            <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
          </span>
          <span className="flex flex-1 flex-col gap-[4px]">
            <Bar className="h-[4px] w-full opacity-70" />
            <Bar className="h-[4px] w-2/3 opacity-50" />
          </span>
        </span>
      </GlyphFrame>
    );
  }

  if (axisKey === 'density') {
    const dots =
      optionId === 'minimal' ? 1 : optionId === 'medium' ? 3 : 9;
    return (
      <GlyphFrame>
        <span
          className={`grid w-full place-content-center gap-[4px] ${glyphClass}`}
          style={{ gridTemplateColumns: `repeat(${dots > 3 ? 3 : dots}, minmax(0,auto))` }}
        >
          {Array.from({ length: dots }).map((_, i) => (
            <span key={i} className="h-[6px] w-[6px] rounded-full bg-current opacity-80" />
          ))}
        </span>
      </GlyphFrame>
    );
  }

  if (axisKey === 'hierarchy') {
    return (
      <GlyphFrame>
        <span className={`flex w-full items-center gap-[6px] ${glyphClass}`}>
          {optionId === 'text-dominant' && (
            <>
              <span className="flex flex-1 flex-col gap-[4px]">
                <Bar className="h-[7px] w-full" />
                <Bar className="h-[4px] w-2/3 opacity-50" />
              </span>
              <Block className="h-[14px] w-[14px] opacity-40" />
            </>
          )}
          {optionId === 'balanced' && (
            <>
              <span className="flex flex-1 flex-col gap-[4px]">
                <Bar className="h-[5px] w-full" />
                <Bar className="h-[4px] w-3/4 opacity-50" />
              </span>
              <Block className="h-[26px] w-[26px] opacity-40" />
            </>
          )}
          {optionId === 'visual-dominant' && (
            <>
              <Block className="h-[34px] flex-1 opacity-40" />
              <Bar className="h-[4px] w-[10px] opacity-60" />
            </>
          )}
        </span>
      </GlyphFrame>
    );
  }

  if (axisKey === 'brandIntensity') {
    const size =
      optionId === 'brand-dominant' ? 26 : optionId === 'balanced' ? 16 : 8;
    return (
      <GlyphFrame>
        <span className={`flex w-full items-center gap-[6px] ${glyphClass}`}>
          <span
            className="rounded-[4px] bg-current"
            style={{ width: size, height: size }}
          />
          <span className="flex flex-1 flex-col gap-[4px]">
            <Bar className="h-[4px] w-full opacity-50" />
            <Bar className="h-[4px] w-3/4 opacity-50" />
            <Bar className="h-[4px] w-1/2 opacity-50" />
          </span>
        </span>
      </GlyphFrame>
    );
  }

  // Composição
  return (
    <GlyphFrame>
      <span className={`w-full ${glyphClass}`}>
        {optionId === 'centered' && (
          <span className="flex h-full flex-col items-center justify-center gap-[4px]">
            <Bar className="h-[5px] w-[60%]" />
            <Bar className="h-[3px] w-[40%] opacity-50" />
          </span>
        )}
        {optionId === 'asymmetric' && (
          <span className="flex h-full flex-col justify-center gap-[4px]">
            <Bar className="h-[5px] w-[70%]" />
            <Bar className="h-[3px] w-[45%] opacity-50" />
            <span className="ml-auto block h-[10px] w-[10px] rounded-[3px] bg-current opacity-40" />
          </span>
        )}
        {optionId === 'grid' && (
          <span className="grid h-full grid-cols-2 grid-rows-2 gap-[4px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="rounded-[3px] bg-current opacity-50" />
            ))}
          </span>
        )}
        {optionId === 'magazine' && (
          <span className="flex h-full flex-col gap-[4px]">
            <Bar className="h-[5px] w-full" />
            <span className="flex flex-1 gap-[4px]">
              <Block className="flex-1 opacity-40" />
              <Block className="flex-1 opacity-40" />
            </span>
          </span>
        )}
        {optionId === 'bento' && (
          <span className="grid h-full grid-cols-3 grid-rows-2 gap-[4px]">
            <span className="col-span-2 row-span-2 rounded-[3px] bg-current opacity-50" />
            <span className="rounded-[3px] bg-current opacity-40" />
            <span className="rounded-[3px] bg-current opacity-40" />
          </span>
        )}
        {optionId === 'modular' && (
          <span className="flex h-full flex-col justify-center gap-[5px]">
            <Block className="h-[7px] w-full opacity-50" />
            <Block className="h-[7px] w-full opacity-40" />
            <Block className="h-[7px] w-full opacity-30" />
          </span>
        )}
      </span>
    </GlyphFrame>
  );
}

// Prévia aproximada de um slide: reflete cores, estilo, hierarquia, composição
// e uso de imagens em tempo real, para a pessoa ver +/- o que vai sair antes de
// a IA gerar.
function previewColors(brandColors?: string) {
  const list = (brandColors || '')
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);
  return {
    bg: list[0] || '#0F172A',
    text: list[1] || '#F8FAFC',
    accent: list[2] || '#2563EB',
  };
}

const SEQUENCE_ROLES = ['Capa', 'Conteúdo', 'Fechamento'];

function SlidePreview({
  spec,
  brandColors,
  headline,
  headlines,
}: {
  spec: DirectionSpec;
  brandColors?: string;
  headline?: string;
  headlines?: string[];
}) {
  const { bg, text, accent } = previewColors(brandColors);
  const serif = ['editorial-premium', 'luxo', 'revista', 'institucional'].includes(
    spec.editorial
  );
  const fontFamily = serif
    ? "Georgia, 'Times New Roman', serif"
    : "Inter, system-ui, sans-serif";
  const big = spec.hierarchy === 'text-dominant';
  const small = spec.hierarchy === 'visual-dominant';
  const dense = spec.density === 'rich';
  const centered = spec.composition === 'centered';
  const showImage = spec.imagery !== 'none';
  const Icon = imageryIcons[spec.imagery] || Sparkles;
  const sequence = (headlines && headlines.length ? headlines : [headline || ''])
    .map((h) => (h || '').trim())
    .slice(0, 3);
  const title = sequence[0] || (headline || '').trim() || 'Sua headline aparece aqui';

  return (
    <div className="w-full max-w-[280px]">
      <div
        className="flex aspect-square w-full flex-col overflow-hidden rounded-[16px] border border-black/10 p-[22px] shadow-sm transition-colors duration-300 dark:border-white/10"
        style={{ background: bg, color: text }}
      >
        <div
          className="flex items-center justify-between text-[10px] font-[800] uppercase tracking-[0.12em]"
          style={{ opacity: 0.75 }}
        >
          <span>Sua marca</span>
          {dense && <span style={{ color: accent }}>● ● ●</span>}
        </div>

        <div
          className={`flex flex-1 flex-col justify-center gap-[10px] ${
            centered ? 'items-center text-center' : 'items-start text-left'
          }`}
        >
          {showImage && (
            <div
              className="flex items-center justify-center rounded-[10px]"
              style={{
                width: small ? '100%' : 48,
                height: small ? 92 : 48,
                background: 'rgba(127,127,127,0.18)',
                border: `1px solid ${accent}55`,
              }}
            >
              <Icon style={{ width: 18, height: 18, color: text, opacity: 0.8 }} strokeWidth={1.7} />
            </div>
          )}
          <span
            style={{
              fontFamily: serif
                ? "Georgia, 'Times New Roman', serif"
                : "Inter, system-ui, sans-serif",
              fontWeight: 800,
              lineHeight: 1.05,
              fontSize: big ? 27 : small ? 16 : 21,
            }}
          >
            {title}
          </span>
          <span
            className="block rounded-full"
            style={{ height: 3, width: centered ? '40%' : '55%', background: accent }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span
            className="rounded-full px-[10px] py-[5px] text-[10px] font-[800]"
            style={{ background: accent, color: bg }}
          >
            Saiba mais
          </span>
          <span style={{ opacity: 0.5, fontSize: 10 }}>1/6</span>
        </div>
      </div>

      {/* Sequência do carrossel: capa → conteúdo → fechamento */}
      {sequence.length > 1 && (
        <div className="mt-[10px] grid grid-cols-3 gap-[6px]">
          {sequence.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-[3px]">
              <div
                className="flex aspect-square w-full flex-col justify-between overflow-hidden rounded-[8px] border border-black/10 p-[6px] dark:border-white/10"
                style={{ background: bg, color: text }}
              >
                <span
                  className="block rounded-full"
                  style={{ height: 2, width: '45%', background: text, opacity: 0.4 }}
                />
                <span
                  style={{
                    fontFamily,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    fontSize: 7,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item || 'Slide'}
                </span>
                <span
                  className="block rounded-full"
                  style={{ height: 3, width: '32%', background: accent }}
                />
              </div>
              <span className="text-[9px] font-[700] text-black/40 dark:text-white/40">
                {SEQUENCE_ROLES[index]}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-[8px] text-center text-[11px] text-black/45 dark:text-white/45">
        Prévia aproximada — muda conforme suas escolhas
      </p>
    </div>
  );
}

type DirectionPanelProps = {
  spec: DirectionSpec;
  setSpec: (next: DirectionSpec) => void;
  platform: string;
  sampleHeadline?: string;
  sampleHeadlines?: string[];
  // Chips de "derivado de": rótulos da estratégia (template, objetivo, etc.).
  derivedFrom: string[];
  // Eixos que ainda estão no valor sugerido pela estratégia (mostram a tag).
  suggestedAxes?: DirectionAxisKey[];
  brandColors?: string;
  generating?: boolean;
  onGenerate?: () => void;
  // Crítica editorial (opcional): mantém o recurso que vivia no painel antigo.
  applyEditorialQuickFixes?: () => void;
  correctingEditorial?: boolean;
  editorialReview?: EditorialReview | null;
  fixCarouselWithAi?: () => void;
  reviewCarouselQuality?: () => void;
  reviewingEditorial?: boolean;
};

function AxisRow({
  axisKey,
  title,
  description,
  suggested,
  options,
  value,
  onChange,
}: {
  axisKey: DirectionAxisKey;
  title: string;
  description?: string;
  suggested?: boolean;
  options: DirectionAxisOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[13px] font-[800] text-black dark:text-white">
          {title}
        </span>
        {suggested && (
          <span className="text-[11px] font-[700] text-stone-500 dark:text-stone-300">
            sugerido
          </span>
        )}
      </div>
      {description && (
        <p className="mt-[2px] text-[12px] text-black/50 dark:text-white/50">
          {description}
        </p>
      )}
      <div className="mt-[8px] grid grid-cols-2 gap-[8px] sm:grid-cols-3 md:grid-cols-4">
        {options.map((option, index) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              style={{ animationDelay: `${index * 35}ms` }}
              className={`dir-card group flex flex-col items-start gap-[2px] rounded-[12px] border px-[10px] py-[10px] text-left transition ${
                active
                  ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                  : 'border-black/10 bg-white text-black/70 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'
              }`}
            >
              <AxisGlyph axisKey={axisKey} optionId={option.id} active={active} />
              <span className="text-[13px] font-[700] leading-tight">
                {option.label}
              </span>
              {option.hint && (
                <span
                  className={`text-[11px] leading-snug ${
                    active
                      ? 'text-white/70 dark:text-stone-950/70'
                      : 'text-black/45 dark:text-white/45'
                  }`}
                >
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DirectionPanel(props: DirectionPanelProps) {
  const {
    spec,
    setSpec,
    platform,
    sampleHeadline,
    sampleHeadlines,
    derivedFrom,
    suggestedAxes = [],
    brandColors,
    generating,
    onGenerate,
    applyEditorialQuickFixes,
    correctingEditorial,
    editorialReview,
    fixCarouselWithAi,
    reviewCarouselQuality,
    reviewingEditorial,
  } = props;

  const isSuggested = (axis: DirectionAxisKey) => suggestedAxes.includes(axis);
  const update = (axis: DirectionAxisKey, id: string) =>
    setSpec({ ...spec, [axis]: id });

  const brandSwatch = (brandColors || '')
    .split(',')
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <style>{`
        @keyframes dirIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes dirPulse { 0%, 100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.04); opacity: 1; } }
        .dir-card { animation: dirIn .42s ease both; }
        .dir-glyph-active { animation: dirPulse 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dir-card { animation: none; }
          .dir-glyph-active { animation: none; }
          .dir-glyph-inner { transition: none !important; }
        }
      `}</style>
      <div className="mb-[14px] flex items-start gap-[12px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
          2
        </div>
        <div>
          <h3 className="text-[22px] font-[800] text-black dark:text-white">
            Direção criativa
          </h3>
          <p className="mt-[4px] max-w-[760px] text-[14px] leading-relaxed text-black/60 dark:text-white/60">
            Já preenchida pela sua estratégia. Ajuste só o que discordar — sem
            garimpar imagens de referência.
          </p>
        </div>
      </div>

      {derivedFrom.length > 0 && (
        <div className="mb-[16px] flex flex-wrap items-center gap-[6px] rounded-[12px] border border-black/10 bg-stone-50 px-[12px] py-[10px] dark:border-white/10 dark:bg-black/20">
          <span className="text-[12px] text-black/45 dark:text-white/45">
            derivado de
          </span>
          {derivedFrom.map((item) => (
            <span
              key={item}
              className="rounded-[999px] border border-black/10 bg-white px-[9px] py-[3px] text-[12px] text-black/65 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col items-stretch gap-[16px] md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-[16px] rounded-[14px] border border-black/10 bg-stone-50 p-[16px] dark:border-white/10 dark:bg-black/20">
        <AxisRow
          axisKey="editorial"
          title="Estilo editorial"
          description="O clima geral da arte — a 'cara' que o carrossel vai ter."
          suggested={isSuggested('editorial')}
          options={editorialPresets}
          value={spec.editorial}
          onChange={(id) => update('editorial', id)}
        />
        <AxisRow
          axisKey="hierarchy"
          title="Hierarquia visual"
          description="O que se destaca mais em cada slide: o texto ou a imagem."
          suggested={isSuggested('hierarchy')}
          options={hierarchyPresets}
          value={spec.hierarchy}
          onChange={(id) => update('hierarchy', id)}
        />
        <AxisRow
          axisKey="density"
          title="Densidade visual"
          description="Quantidade de elementos na arte — do mais vazio ao mais cheio."
          suggested={isSuggested('density')}
          options={densityPresets}
          value={spec.density}
          onChange={(id) => update('density', id)}
        />
        <AxisRow
          axisKey="composition"
          title="Composição"
          description="Como os elementos ficam organizados no slide."
          suggested={isSuggested('composition')}
          options={compositionPresets}
          value={spec.composition}
          onChange={(id) => update('composition', id)}
        />
        <AxisRow
          axisKey="imagery"
          title="Uso de imagens"
          description="Que tipo de imagem aparece junto do texto."
          suggested={isSuggested('imagery')}
          options={imageryPresets}
          value={spec.imagery}
          onChange={(id) => update('imagery', id)}
        />
        <AxisRow
          axisKey="brandIntensity"
          title="Intensidade da marca"
          description="O quanto a sua marca (logo e cores) aparece na arte."
          suggested={isSuggested('brandIntensity')}
          options={brandIntensityPresets}
          value={spec.brandIntensity}
          onChange={(id) => update('brandIntensity', id)}
        />
      </div>

        <div className="flex justify-center self-start md:sticky md:top-[16px] md:w-[280px] md:shrink-0">
          <SlidePreview
            spec={spec}
            brandColors={brandColors}
            headline={sampleHeadline}
            headlines={sampleHeadlines}
          />
        </div>
      </div>

      <div className="mt-[16px] flex flex-wrap items-center justify-between gap-[12px] border-t border-black/10 pt-[14px] dark:border-white/10">
        <div className="flex items-center gap-[8px] text-[12px] text-black/60 dark:text-white/60">
          {brandSwatch.length > 0 && (
            <span className="flex">
              {brandSwatch.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="h-[14px] w-[14px] rounded-full border border-black/10 dark:border-white/20"
                  style={{ backgroundColor: color, marginLeft: index ? -4 : 0 }}
                />
              ))}
            </span>
          )}
          <span>{summarizeDirection(spec, platform)}</span>
        </div>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-[10px] bg-stone-950 px-[18px] py-[10px] text-[13px] font-[900] text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-100"
          >
            {generating ? 'Gerando...' : 'Gerar as artes'}
          </button>
        )}
      </div>

      {reviewCarouselQuality && (
        <div className="mt-[14px] flex flex-wrap gap-[10px]">
          <button
            type="button"
            onClick={() => reviewCarouselQuality()}
            disabled={reviewingEditorial}
            className="rounded-[10px] border border-white/10 bg-white/10 px-[14px] py-[9px] text-[12px] font-[900] text-black/70 hover:bg-black/5 dark:text-white dark:hover:bg-white/15 disabled:opacity-50"
          >
            {reviewingEditorial ? 'Revisando...' : 'Rodar crítica editorial'}
          </button>
          {editorialReview && (
            <span className="rounded-[10px] border border-black/10 bg-black/[0.03] dark:border-white/10 dark:bg-white/5 px-[12px] py-[9px] text-[12px] font-[800] text-black/70 dark:text-white/80">
              Score editorial: {editorialReview.score}/100
            </span>
          )}
          {!!editorialReview?.issues?.length && applyEditorialQuickFixes && (
            <button
              type="button"
              onClick={applyEditorialQuickFixes}
              className="rounded-[10px] border border-emerald-500/25 bg-emerald-500/10 px-[14px] py-[9px] text-[12px] font-[900] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
            >
              Aplicar correções rápidas
            </button>
          )}
          {!!editorialReview?.issues?.length && fixCarouselWithAi && (
            <button
              type="button"
              onClick={fixCarouselWithAi}
              disabled={correctingEditorial}
              className="rounded-[10px] border border-stone-500/20 bg-stone-500/10 px-[14px] py-[9px] text-[12px] font-[900] text-stone-700 hover:bg-stone-500/15 disabled:opacity-50 dark:text-stone-100"
            >
              {correctingEditorial ? 'Corrigindo...' : 'Corrigir slides'}
            </button>
          )}
        </div>
      )}

      {editorialReview && (
        <div className="mt-[12px] rounded-[14px] border border-black/10 bg-stone-50 p-[14px] dark:border-white/10 dark:bg-black/20">
          <div className="text-[13px] font-[800] text-black dark:text-white">
            {editorialReview.verdict}
          </div>
          {!!editorialReview.strengths?.length && (
            <div className="mt-[8px] text-[12px] text-emerald-700 dark:text-emerald-200">
              Pontos fortes: {editorialReview.strengths.join(', ')}
            </div>
          )}
          {!!editorialReview.issues?.length && (
            <div className="mt-[10px] flex flex-col gap-[6px]">
              {editorialReview.issues.slice(0, 6).map((issue, index) => (
                <div
                  key={`${issue.issue}-${index}`}
                  className="rounded-[10px] bg-white p-[10px] text-[12px] text-black/70 dark:bg-white/5 dark:text-white/75"
                >
                  <strong className="text-amber-700 dark:text-amber-200">
                    {issue.slide ? `Slide ${issue.slide}: ` : ''}
                    {issue.severity}
                  </strong>{' '}
                  {issue.issue} — {issue.suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

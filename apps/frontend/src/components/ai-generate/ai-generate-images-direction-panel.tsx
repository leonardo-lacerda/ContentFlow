import type { DirectionAxisOption } from './ai-generate-images.presets';
import {
  brandIntensityPresets,
  compositionPresets,
  densityPresets,
  editorialPresets,
  hierarchyPresets,
  imageryPresets,
} from './ai-generate-images.presets';
import type {
  DirectionAxisKey,
  DirectionSpec,
} from './direction-compiler';
import { summarizeDirection } from './direction-compiler';

type DirectionPanelProps = {
  spec: DirectionSpec;
  setSpec: (next: DirectionSpec) => void;
  platform: string;
  // Chips de "derivado de": rótulos da estratégia (template, objetivo, etc.).
  derivedFrom: string[];
  // Eixos que ainda estão no valor sugerido pela estratégia (mostram a tag).
  suggestedAxes?: DirectionAxisKey[];
  brandColors?: string;
  generating?: boolean;
  onGenerate?: () => void;
};

function AxisRow({
  title,
  suggested,
  options,
  value,
  onChange,
}: {
  title: string;
  suggested?: boolean;
  options: DirectionAxisOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-[8px]">
        <span className="text-[12px] font-[800] text-black dark:text-white">
          {title}
        </span>
        {suggested && (
          <span className="text-[11px] font-[700] text-stone-500 dark:text-stone-300">
            sugerido
          </span>
        )}
      </div>
      <div className="mt-[6px] flex flex-wrap gap-[6px]">
        {options.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              title={option.prompt}
              className={`rounded-[999px] border px-[11px] py-[6px] text-[12px] font-[700] transition ${
                active
                  ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                  : 'border-black/10 bg-white text-black/70 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'
              }`}
            >
              {option.label}
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
    derivedFrom,
    suggestedAxes = [],
    brandColors,
    generating,
    onGenerate,
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
      <div className="mb-[14px] flex items-start gap-[12px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
          3
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

      <div className="flex flex-col gap-[16px] rounded-[14px] border border-black/10 bg-stone-50 p-[16px] dark:border-white/10 dark:bg-black/20">
        <AxisRow
          title="Estilo editorial"
          suggested={isSuggested('editorial')}
          options={editorialPresets}
          value={spec.editorial}
          onChange={(id) => update('editorial', id)}
        />
        <AxisRow
          title="Hierarquia visual"
          suggested={isSuggested('hierarchy')}
          options={hierarchyPresets}
          value={spec.hierarchy}
          onChange={(id) => update('hierarchy', id)}
        />
        <AxisRow
          title="Densidade visual"
          suggested={isSuggested('density')}
          options={densityPresets}
          value={spec.density}
          onChange={(id) => update('density', id)}
        />
        <AxisRow
          title="Composição"
          suggested={isSuggested('composition')}
          options={compositionPresets}
          value={spec.composition}
          onChange={(id) => update('composition', id)}
        />
        <AxisRow
          title="Uso de imagens"
          suggested={isSuggested('imagery')}
          options={imageryPresets}
          value={spec.imagery}
          onChange={(id) => update('imagery', id)}
        />
        <AxisRow
          title="Intensidade da marca"
          suggested={isSuggested('brandIntensity')}
          options={brandIntensityPresets}
          value={spec.brandIntensity}
          onChange={(id) => update('brandIntensity', id)}
        />
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
    </div>
  );
}

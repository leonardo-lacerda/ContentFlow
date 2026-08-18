'use client';

import { FC, useCallback, useMemo, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import {
  CarouselLogoConfig,
  CarouselLogoPosition,
  LOGO_WIDTH_PCT_DEFAULT,
  LOGO_WIDTH_PCT_MAX,
  LOGO_WIDTH_PCT_MIN,
} from './carousel-logo.types';
import { pointerToLogoFraction, resolveLogoCssBox } from './carousel-logo-position.util';

const POSITION_PRESETS: Array<{ id: CarouselLogoPosition; label: string }> = [
  { id: 'top-left', label: 'Superior esquerda' },
  { id: 'top-right', label: 'Superior direita' },
  { id: 'bottom-left', label: 'Inferior esquerda' },
  { id: 'bottom-right', label: 'Inferior direita' },
  { id: 'center', label: 'Centro' },
];

type Props = {
  slideImageUrl: string;
  initialLogo: CarouselLogoConfig | null;
  disabled?: boolean;
  onApply: (logo: CarouselLogoConfig) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  onCancel: () => void;
};

export const CarouselLogoEditor: FC<Props> = ({
  slideImageUrl,
  initialLogo,
  disabled,
  onApply,
  onRemove,
  onCancel,
}) => {
  const apiFetch = useFetch();
  const previewRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo?.url || null);
  const [mediaId, setMediaId] = useState<string | null>(initialLogo?.mediaId || null);
  const [logoAspect, setLogoAspect] = useState(1);
  const [position, setPosition] = useState<CarouselLogoPosition>(initialLogo?.position || 'bottom-right');
  const [x, setX] = useState(initialLogo?.x ?? 0.5);
  const [y, setY] = useState(initialLogo?.y ?? 0.5);
  const [widthPct, setWidthPct] = useState(initialLogo?.widthPct || LOGO_WIDTH_PCT_DEFAULT);
  const [opacity, setOpacity] = useState(initialLogo?.opacity ?? 1);
  const [dragging, setDragging] = useState(false);

  const box = useMemo(
    () => resolveLogoCssBox(position, widthPct, logoAspect, x, y),
    [position, widthPct, logoAspect, x, y]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith('image/')) {
        setError('Envie um arquivo de imagem (PNG, JPG, SVG ou WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('A logo deve ter no máximo 5 MB.');
        return;
      }
      setUploading(true);
      try {
        const objectUrl = URL.createObjectURL(file);
        const naturalAspect = await new Promise<number>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img.naturalHeight / (img.naturalWidth || 1));
          img.onerror = () => reject(new Error('invalid image'));
          img.src = objectUrl;
        });
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiFetch('/media/upload-simple', {
          method: 'POST',
          body: formData,
        });
        URL.revokeObjectURL(objectUrl);
        if (!response.ok) {
          throw new Error('upload failed');
        }
        const saved = await response.json();
        setMediaId(saved.id);
        setLogoUrl(saved.path);
        setLogoAspect(naturalAspect || 1);
      } catch {
        setError('Não foi possível enviar a logo. Tente novamente.');
      } finally {
        setUploading(false);
      }
    },
    [apiFetch]
  );

  const onFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) void handleUpload(file);
    },
    [handleUpload]
  );

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!logoUrl) return;
      event.preventDefault();
      setDragging(true);
      const container = previewRef.current;
      if (!container) return;
      const move = (moveEvent: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const fraction = pointerToLogoFraction(
          moveEvent.clientX - rect.left,
          moveEvent.clientY - rect.top,
          rect.width,
          rect.height
        );
        setX(fraction.x);
        setY(fraction.y);
        setPosition('custom');
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [logoUrl]
  );

  const canApply = Boolean(logoUrl && mediaId) && !uploading && !applying && !disabled;

  const handleApply = useCallback(async () => {
    if (!logoUrl || !mediaId) return;
    setApplying(true);
    setError(null);
    try {
      await onApply({
        mediaId,
        url: logoUrl,
        position,
        ...(position === 'custom' ? { x, y } : {}),
        widthPct,
        opacity,
      });
    } catch {
      setError('Não foi possível aplicar a logo. Tente novamente.');
    } finally {
      setApplying(false);
    }
  }, [logoUrl, mediaId, position, x, y, widthPct, opacity, onApply]);

  const handleRemove = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      await onRemove();
    } catch {
      setError('Não foi possível remover a logo. Tente novamente.');
    } finally {
      setApplying(false);
    }
  }, [onRemove]);

  return (
    <div className="cf-logo-editor" aria-label="Editor de logo">
      <div className="cf-logo-editor__preview-wrap">
        <div
          ref={previewRef}
          className="cf-logo-editor__preview"
          style={{ backgroundImage: `url(${slideImageUrl})` }}
        >
          {logoUrl && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Arraste para posicionar a logo"
              onPointerDown={startDrag}
              className={`cf-logo-editor__logo-handle${dragging ? ' is-dragging' : ''}`}
              style={{
                left: `${box.leftPct}%`,
                top: `${box.topPct}%`,
                width: `${box.widthPct}%`,
                opacity,
              }}
            >
              <img src={logoUrl} alt="Pré-visualização da logo" draggable={false} />
            </div>
          )}
        </div>
        <p className="cf-logo-editor__hint">
          {logoUrl ? 'Arraste a logo sobre a imagem para posicioná-la livremente.' : 'Envie um arquivo de logo para começar.'}
        </p>
      </div>

      <div className="cf-logo-editor__controls">
        <label className="cf-logo-editor__upload">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFileInputChange} disabled={uploading || applying} />
          {uploading ? 'Enviando…' : logoUrl ? 'Trocar arquivo de logo' : 'Enviar arquivo de logo'}
        </label>

        {error && <p className="cf-logo-editor__error">{error}</p>}

        <fieldset disabled={!logoUrl || applying}>
          <legend>Posição</legend>
          <div className="cf-logo-editor__positions">
            {POSITION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={position === preset.id ? 'is-active' : ''}
                onClick={() => setPosition(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="cf-logo-editor__slider">
            Tamanho
            <input
              type="range"
              min={LOGO_WIDTH_PCT_MIN}
              max={LOGO_WIDTH_PCT_MAX}
              value={widthPct}
              onChange={(event) => setWidthPct(Number(event.target.value))}
            />
          </label>

          <label className="cf-logo-editor__slider">
            Opacidade
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </label>
        </fieldset>

        <div className="cf-logo-editor__actions">
          <button type="button" className="is-quiet" onClick={onCancel} disabled={applying}>
            Cancelar
          </button>
          {initialLogo && (
            <button type="button" className="is-danger" onClick={handleRemove} disabled={applying}>
              Remover logo
            </button>
          )}
          <button type="button" className="is-primary" onClick={handleApply} disabled={!canApply}>
            {applying ? 'Aplicando…' : 'Aplicar logo'}
          </button>
        </div>
      </div>
    </div>
  );
};

'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useMediaDirectory } from '@gitroom/react/helpers/use.media.directory';
import { CarouselLogoEditor } from './carousel-logo-editor.component';
import { CarouselLogoConfig } from './carousel-logo.types';

export type CarouselViewerSlide = { id: string; path: string; alt?: string };

export type CarouselViewerMedia = {
  id: string; // synthetic "carousel:<id1>:<id2>:..." id
  originalName?: string;
  carouselProject?: {
    company?: { name?: string };
    generation?: { totalCost?: { brl?: number } };
    plan?: { title?: string };
    creativeBrief?: string;
    logo?: CarouselLogoConfig;
  } | null;
  children: CarouselViewerSlide[];
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to pick up the click before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const filenameFromResponse = (response: Response, fallback: string) => {
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
};

const projectTitle = (media: CarouselViewerMedia) =>
  media.carouselProject?.plan?.title ||
  media.originalName?.replace(/^Carrossel:\s*/, '').replace(/\s*\([^)]*\)\s*$/, '') ||
  'Projeto gerado por IA';

type Props = {
  media: CarouselViewerMedia;
  onLogoChanged: (logo: CarouselLogoConfig | null) => void;
};

export const CarouselViewerModal: FC<Props> = ({ media, onLogoChanged }) => {
  const apiFetch = useFetch();
  const mediaDirectory = useMediaDirectory();
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingLogo, setEditingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<CarouselLogoConfig | null>(
    media.carouselProject?.logo || null
  );
  const [busy, setBusy] = useState<'slide' | 'zip' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const slides = media.children;
  const activeSlide = slides[activeIndex];
  const project = media.carouselProject;

  const goTo = useCallback(
    (index: number) => setActiveIndex((current) => Math.max(0, Math.min(slides.length - 1, index))),
    [slides.length]
  );

  const downloadSlide = useCallback(async () => {
    if (!activeSlide) return;
    setBusy('slide');
    setDownloadError(null);
    try {
      const response = await apiFetch(
        `/media/carousel/slide/download?groupId=${encodeURIComponent(media.id)}&mediaId=${encodeURIComponent(activeSlide.id)}`
      );
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      triggerBlobDownload(blob, filenameFromResponse(response, `slide-${activeIndex + 1}.png`));
    } catch {
      setDownloadError('Não foi possível baixar esta imagem. Tente novamente.');
    } finally {
      setBusy(null);
    }
  }, [apiFetch, media.id, activeSlide, activeIndex]);

  const downloadZip = useCallback(async () => {
    setBusy('zip');
    setDownloadError(null);
    try {
      const response = await apiFetch(`/media/carousel/download-zip?groupId=${encodeURIComponent(media.id)}`);
      if (!response.ok) throw new Error('download failed');
      const blob = await response.blob();
      triggerBlobDownload(blob, filenameFromResponse(response, 'carrossel.zip'));
    } catch {
      setDownloadError('Não foi possível baixar o carrossel. Tente novamente.');
    } finally {
      setBusy(null);
    }
  }, [apiFetch, media.id]);

  const applyLogo = useCallback(
    async (logo: CarouselLogoConfig) => {
      const response = await apiFetch('/media/carousel/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: media.id, logo }),
      });
      if (!response.ok) throw new Error('failed to apply logo');
      setCurrentLogo(logo);
      onLogoChanged(logo);
      setEditingLogo(false);
    },
    [apiFetch, media.id, onLogoChanged]
  );

  const removeLogo = useCallback(async () => {
    const response = await apiFetch('/media/carousel/logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: media.id }),
    });
    if (!response.ok) throw new Error('failed to remove logo');
    setCurrentLogo(null);
    onLogoChanged(null);
    setEditingLogo(false);
  }, [apiFetch, media.id, onLogoChanged]);

  const activeSlideUrl = activeSlide ? mediaDirectory.set(activeSlide.path) : '';

  if (editingLogo && activeSlide) {
    return (
      <div className="cf-carousel-viewer">
        <CarouselLogoEditor
          slideImageUrl={activeSlideUrl}
          initialLogo={currentLogo}
          onApply={applyLogo}
          onRemove={removeLogo}
          onCancel={() => setEditingLogo(false)}
        />
      </div>
    );
  }

  return (
    <div className="cf-carousel-viewer">
      {project && (
        <div className="cf-carousel-viewer__project-banner">
          <span className="cf-carousel-viewer__badge">Projeto AI Images</span>
          {project.company?.name && <span className="cf-carousel-viewer__badge is-quiet">{project.company.name}</span>}
          <div className="cf-carousel-viewer__project-info">
            <strong>{projectTitle(media)}</strong>
            {project.creativeBrief && <p>{project.creativeBrief}</p>}
          </div>
        </div>
      )}

      <div className="cf-carousel-viewer__main">
        <button
          type="button"
          aria-label="Slide anterior"
          className="cf-carousel-viewer__nav"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          ‹
        </button>

        <div className="cf-carousel-viewer__stage">
          {activeSlide && (
            <img src={activeSlideUrl} alt={activeSlide.alt || `Slide ${activeIndex + 1}`} />
          )}
          <div className="cf-carousel-viewer__slide-indicator">
            Slide {activeIndex + 1} de {slides.length}
          </div>
        </div>

        <button
          type="button"
          aria-label="Próximo slide"
          className="cf-carousel-viewer__nav"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex === slides.length - 1}
        >
          ›
        </button>
      </div>

      <div className="cf-carousel-viewer__thumbnails">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={index === activeIndex ? 'is-active' : ''}
            onClick={() => goTo(index)}
            aria-label={`Ir para o slide ${index + 1}`}
            aria-current={index === activeIndex}
          >
            <img src={mediaDirectory.set(slide.path)} alt={slide.alt || `Miniatura do slide ${index + 1}`} />
          </button>
        ))}
      </div>

      {downloadError && <p className="cf-carousel-viewer__error">{downloadError}</p>}

      <div className="cf-carousel-viewer__toolbar">
        <button type="button" onClick={downloadSlide} disabled={busy !== null}>
          {busy === 'slide' ? 'Baixando…' : 'Baixar esta imagem'}
        </button>
        <button type="button" onClick={downloadZip} disabled={busy !== null}>
          {busy === 'zip' ? 'Baixando…' : 'Baixar carrossel completo'}
        </button>
        <button type="button" onClick={() => setEditingLogo(true)} disabled={busy !== null}>
          {currentLogo ? 'Editar logo' : 'Adicionar logo'}
        </button>
        {currentLogo && (
          <button type="button" className="is-danger" onClick={() => void removeLogo()} disabled={busy !== null}>
            Remover logo
          </button>
        )}
      </div>
    </div>
  );
};

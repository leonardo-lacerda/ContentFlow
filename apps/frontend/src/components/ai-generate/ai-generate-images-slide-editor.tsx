import { inputClass, textAreaClass } from './ai-generate-images.constants';
import { imageSrc } from './ai-generate-images.utils';
import {
  AnimatedDots,
  IndeterminateBar,
  Spinner,
  SlideMediaLoading,
} from './ai-generate-images.loaders';
import type {
  CarouselPlan,
  CarouselSlide,
  ReferenceImage,
  SlideImageResult,
} from './ai-generate-images.types';
import {
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Download,
  GripVertical,
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SlideEditorPanelProps = {
  addSlide: (afterIndex: number) => void;
  duplicateSlide: (index: number) => void;
  exportSingleSlide: (slideId: string) => void;
  generateSlideImage: (slide: CarouselSlide) => void;
  /** Fase 3 — recompõe só o texto sobre o fundo híbrido salvo (custo ~zero). */
  recomposeSlideText?: (slide: CarouselSlide) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  plan: CarouselPlan;
  regenerateSlideCopy: (slide: CarouselSlide, mode: string) => void;
  removeSlide: (index: number) => void;
  restoreImageVersion: (slideId: string, historyIndex: number) => void;
  restoreSlideVersion: (slideId: string, historyIndex: number) => void;
  selectedReferences: ReferenceImage[];
  setLightboxIndex: (index: number) => void;
  setPlan: (plan: CarouselPlan) => void;
  slideHistory: Record<string, CarouselSlide[]>;
  slideImageHistory: Record<string, SlideImageResult[]>;
  slideImageAdjustments: Record<string, string>;
  setSlideImageAdjustment: (slideId: string, value: string) => void;
  slideImages: Record<string, SlideImageResult>;
  slideLoading: Record<string, string>;
  trimmedImageModel: string;
  updateSlide: (
    slideId: string,
    field: keyof CarouselSlide,
    value: string
  ) => void;
};

/** Wrapper that makes a slide draggable via @dnd-kit/sortable. */
const SortableSlide = memo(function SortableSlide({
  slide,
  slideIndex,
  children,
}: {
  slide: CarouselSlide;
  slideIndex: number;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start gap-[8px]">
        <button
          type="button"
          className="mt-[20px] flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur cursor-grab active:cursor-grabbing hover:border-primary hover:text-primary transition"
          title="Arrastar para reordenar"
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
});
export const SlideEditorPanel = memo(function SlideEditorPanel(props: SlideEditorPanelProps) {
  const {
    addSlide,
    duplicateSlide,
    exportSingleSlide,
    generateSlideImage,
    recomposeSlideText,
    moveSlide,
    plan,
    regenerateSlideCopy,
    removeSlide,
    restoreImageVersion,
    restoreSlideVersion,
    selectedReferences,
    setLightboxIndex,
    setPlan,
    slideHistory,
    slideImageAdjustments,
    setSlideImageAdjustment,
    slideImageHistory,
    slideImages,
    slideLoading,
    trimmedImageModel,
    updateSlide,
  } = props;

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !plan) return;

    const fromSlide = plan.slides.find((s) => s.id === active.id);
    const toSlide = plan.slides.find((s) => s.id === over.id);
    if (fromSlide && toSlide) {
      moveSlide(fromSlide.index, toSlide.index);
    }
  }, [plan, moveSlide]);

  const slideIds = useMemo(() => plan.slides.map((s) => s.id), [plan.slides]);

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[32px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[24px] flex flex-col gap-[8px]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 font-bold text-stone-800 dark:text-stone-100">
            3
          </div>
          <h3 className="text-[24px] font-[700] text-black dark:text-white">
            Revise a copy visual
          </h3>
        </div>
        <p className="text-[15px] text-black/60 dark:text-white/60 ml-13 pl-[12px]">
          Esses textos serão renderizados dentro das imagens. Ajuste a
          headline, apoio e CTA antes de gerar.
        </p>
      </div>

      <div className="ml-11 grid grid-cols-1 gap-[16px] md:grid-cols-2">
        <label className="flex flex-col gap-[8px] md:col-span-2">
          <span className="text-[14px] font-[600]">
            Legenda fora da imagem
          </span>
          <textarea
            value={plan.caption}
            onChange={(event) =>
              setPlan({ ...plan, caption: event.target.value })
            }
            className={`${textAreaClass} min-h-[140px] text-[15px] leading-relaxed`}
          />
        </label>

        <div className="md:col-span-2 mt-4 space-y-6">
          <h4 className="text-[16px] font-[600] border-b border-newTableBorder pb-2">
            Slides do Carrossel
          </h4>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={slideIds}
              strategy={verticalListSortingStrategy}
            >
          {plan.slides.map((slide, slideIndex) => {
            const result = slideImages[slide.id];
            const src = imageSrc(result?.image);
            const loadingMode = slideLoading[slide.id];
            const isLoading = !!loadingMode;
            const loadingImage = loadingMode === 'imagem';

            return (
              <SortableSlide key={slide.id} slide={slide} slideIndex={slideIndex}>
              <div
                aria-busy={isLoading}
                className={`flex flex-col md:flex-row gap-[24px] rounded-[16px] border p-[20px] bg-newBgColorInner transition-colors ${
                  isLoading ? 'border-primary/40' : 'border-newTableBorder'
                }`}
              >
                <div className="flex-1 flex flex-col gap-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-[700] uppercase tracking-wider">
                      Slide {slide.index}
                    </span>
                    <div className="flex items-center gap-[4px]">
                      {isLoading && (
                        <span className="flex items-center gap-[7px] text-[12px] font-[700] text-primary mr-2">
                          <Spinner size={14} />
                          {loadingImage ? 'Gerando imagem' : 'Reescrevendo copy'}
                          <AnimatedDots />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => moveSlide(slide.index, slide.index - 1)}
                        disabled={slideIndex === 0 || isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Mover slide para esquerda"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(slide.index, slide.index + 1)}
                        disabled={slideIndex === plan.slides.length - 1 || isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Mover slide para direita"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateSlide(slide.index)}
                        disabled={isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Duplicar slide"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addSlide(slide.index)}
                        disabled={isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Adicionar slide após este"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlide(slide.index)}
                        disabled={plan.slides.length <= 2 || isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-red-500/30 text-red-400 transition hover:border-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Remover slide"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => exportSingleSlide(slide.id)}
                        disabled={!src}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Exportar slide como PNG"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isLoading && <IndeterminateBar />}

                  <div className="flex flex-wrap gap-[8px]">
                    <button
                      type="button"
                      onClick={() => regenerateSlideCopy(slide, 'copy')}
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Regenerar copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'estilo')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Variar estilo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'direto')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais direto
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'premium')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais premium
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'provocativo')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais provocativo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'marca')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-stone-500/20 bg-stone-500/10 px-[10px] py-[7px] text-[12px] font-[700] text-stone-700 hover:border-stone-500/40 dark:text-stone-100"
                    >
                      Mais fiel à marca
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'inspiracao')
                      }
                      disabled={
                        !!slideLoading[slide.id] ||
                        !selectedReferences.length
                      }
                      className="rounded-[8px] border border-stone-500/20 bg-stone-500/10 px-[10px] py-[7px] text-[12px] font-[700] text-stone-700 hover:border-stone-500/40 disabled:cursor-not-allowed disabled:opacity-45 dark:text-stone-100"
                    >
                      Mais inspiração
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'menos-inspiracao')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Menos inspiração
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'espaco-texto')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais espaço p/ texto
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'metafora')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Trocar metáfora
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'manter-layout')
                      }
                      disabled={!!slideLoading[slide.id]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Manter layout
                    </button>
                  </div>

                  {!!slideHistory[slide.id]?.length && (
                    <div className="flex flex-wrap items-center gap-[8px] rounded-[10px] border border-newTableBorder bg-newBgColor p-[10px]">
                      <span className="text-[12px] font-[700] text-textItemBlur">
                        Histórico:
                      </span>
                      {slideHistory[slide.id].map((_, historyIndex) => (
                        <button
                          key={`${slide.id}-history-${historyIndex}`}
                          type="button"
                          onClick={() =>
                            restoreSlideVersion(slide.id, historyIndex)
                          }
                          className="rounded-[8px] border border-newTableBorder px-[8px] py-[5px] text-[11px] font-[700] hover:border-primary"
                        >
                          v{historyIndex + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      Headline grande na imagem
                    </span>
                    <textarea
                      value={slide.headline}
                      onChange={(event) =>
                        updateSlide(
                          slide.id,
                          'headline',
                          event.target.value
                        )
                      }
                      className={`${textAreaClass} min-h-[72px] text-[16px] font-[700]`}
                    />
                    <span className={`text-[11px] text-right ${
                      slide.headline.length > 78
                        ? 'text-red-500'
                        : slide.headline.length > 78 * 0.8
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}>
                      {slide.headline.length}/78
                    </span>
                  </label>

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      Texto de apoio na imagem
                    </span>
                    <textarea
                      value={slide.body}
                      onChange={(event) =>
                        updateSlide(
                          slide.id,
                          'body',
                          event.target.value
                        )
                      }
                      className={`${textAreaClass} min-h-[80px]`}
                    />
                    <span className={`text-[11px] text-right ${
                      slide.body.length > 150
                        ? 'text-red-500'
                        : slide.body.length > 150 * 0.8
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}>
                      {slide.body.length}/150
                    </span>
                  </label>

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      CTA ou selo pequeno na imagem
                    </span>
                    <input
                      value={slide.cta}
                      onChange={(event) =>
                        updateSlide(
                          slide.id,
                          'cta',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                    <span className={`text-[11px] text-right ${
                      slide.cta.length > 30
                        ? 'text-red-500'
                        : slide.cta.length > 30 * 0.8
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                    }`}>
                      {slide.cta.length}/30
                    </span>
                  </label>

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      Direção visual do slide
                    </span>
                    <textarea
                      value={slide.imagePrompt}
                      onChange={(event) =>
                        updateSlide(
                          slide.id,
                          'imagePrompt',
                          event.target.value
                        )
                      }
                      className={`${textAreaClass} min-h-[80px]`}
                    />
                    <span className="text-[11px] text-right text-textItemBlur">
                      {slide.imagePrompt.length} caracteres
                    </span>
                  </label>
                </div>

                <div className="w-full md:w-[280px] flex-shrink-0 flex flex-col gap-[12px]">
                  <div className="flex items-center justify-between gap-[8px]">
                    <span className="text-[13px] font-[600]">
                      Imagem Gerada
                    </span>
                    <div className="flex items-center gap-[6px]">
                      {/* Fase 3 — híbrido: recompõe só a camada de texto
                          sobre o fundo salvo, sem nova chamada de IA. */}
                      {recomposeSlideText && result?.background && (
                        <button
                          type="button"
                          onClick={() => recomposeSlideText(slide)}
                          disabled={!!slideLoading[slide.id]}
                          title="Reaplica a copy atual sobre o mesmo fundo (custo ~zero)"
                          className="flex items-center gap-[6px] rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 px-[9px] py-[6px] text-[12px] font-[700] text-emerald-700 hover:border-emerald-500/60 disabled:opacity-60 dark:text-emerald-200"
                        >
                          {slideLoading[slide.id] === 'texto' && (
                            <Spinner size={12} />
                          )}
                          Regenerar texto
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => generateSlideImage(slide)}
                        disabled={
                          !!slideLoading[slide.id] ||
                          !trimmedImageModel
                        }
                        className="flex items-center gap-[6px] rounded-[8px] border border-newTableBorder px-[9px] py-[6px] text-[12px] font-[600] hover:border-primary disabled:opacity-60"
                      >
                        {loadingImage && <Spinner size={12} />}
                        {loadingImage
                          ? 'Gerando...'
                          : result?.background
                          ? 'Regenerar fundo'
                          : 'Regenerar imagem'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <input
                      value={slideImageAdjustments[slide.id] || ''}
                      onChange={(event) =>
                        setSlideImageAdjustment(slide.id, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          if (
                            !slideLoading[slide.id] &&
                            trimmedImageModel
                          ) {
                            generateSlideImage(slide);
                          }
                        }
                      }}
                      placeholder="Ajuste rápido: ex. mais escuro, menos texto…"
                      disabled={!!slideLoading[slide.id]}
                      className={`${inputClass} text-[12px]`}
                    />
                    <span className="text-[11px] text-textItemBlur">
                      Descreva o ajuste e clique em "Regenerar imagem" (ou Enter)
                      para aplicar só neste slide.
                    </span>
                  </div>

                  <div className="relative">
                    {src ? (
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(slideIndex)}
                        className="relative aspect-square rounded-[12px] overflow-hidden border border-newTableBorder group w-full text-left"
                      >
                        <img
                          src={src}
                          alt={slide.altText}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                    ) : (
                      <div className="aspect-square rounded-[12px] border-2 border-dashed border-newTableBorder bg-newBgColor flex flex-col items-center justify-center text-textItemBlur p-4 text-center">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mb-2 opacity-50"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="text-[12px]">
                          Aguardando geração
                        </span>
                      </div>
                    )}
                    {loadingImage && <SlideMediaLoading />}
                  </div>
                  {result?.error && (
                    <div className="text-[12px] text-red-400 mt-1">
                      {result.error}
                    </div>
                  )}
                  {!!slideImageHistory[slide.id]?.length && (
                    <div className="flex flex-wrap items-center gap-[7px] rounded-[10px] border border-newTableBorder bg-newBgColor p-[9px]">
                      <span className="text-[11px] font-[700] text-textItemBlur">
                        Imagens antigas:
                      </span>
                      {slideImageHistory[slide.id].map(
                        (_, historyIndex) => (
                          <button
                            key={`${slide.id}-image-history-${historyIndex}`}
                            type="button"
                            onClick={() =>
                              restoreImageVersion(
                                slide.id,
                                historyIndex
                              )
                            }
                            className="rounded-[8px] border border-newTableBorder px-[8px] py-[5px] text-[11px] font-[700] hover:border-primary"
                          >
                            img v{historyIndex + 1}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
              </SortableSlide>
            );
          })}
          </SortableContext>
        </DndContext>
        </div>
      </div>
    </div>
  );
});

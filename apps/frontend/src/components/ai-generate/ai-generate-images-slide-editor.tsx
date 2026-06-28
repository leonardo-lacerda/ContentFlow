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
} from 'lucide-react';

type SlideEditorPanelProps = {
  addSlide: (afterIndex: number) => void;
  duplicateSlide: (index: number) => void;
  generateSlideImage: (slide: CarouselSlide) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  plan: CarouselPlan;
  regenerateSlideCopy: (slide: CarouselSlide, mode: string) => void;
  removeSlide: (index: number) => void;
  restoreImageVersion: (slideIndex: number, historyIndex: number) => void;
  restoreSlideVersion: (slideIndex: number, historyIndex: number) => void;
  selectedReferences: ReferenceImage[];
  setLightboxIndex: (index: number) => void;
  setPlan: (plan: CarouselPlan) => void;
  slideHistory: Record<number, CarouselSlide[]>;
  slideImageHistory: Record<number, SlideImageResult[]>;
  slideImageAdjustments: Record<number, string>;
  setSlideImageAdjustment: (slideIndex: number, value: string) => void;
  slideImages: Record<number, SlideImageResult>;
  slideLoading: Record<number, string>;
  trimmedImageModel: string;
  updateSlide: (
    slideIndex: number,
    field: keyof CarouselSlide,
    value: string
  ) => void;
};

export function SlideEditorPanel(props: SlideEditorPanelProps) {
  const {
    addSlide,
    duplicateSlide,
    generateSlideImage,
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
          {plan.slides.map((slide, slideIndex) => {
            const result = slideImages[slide.index];
            const src = imageSrc(result?.image);
            const loadingMode = slideLoading[slide.index];
            const isLoading = !!loadingMode;
            const loadingImage = loadingMode === 'imagem';

            return (
              <div
                key={slide.index}
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
                        onClick={() => moveSlide(slideIndex, slideIndex - 1)}
                        disabled={slideIndex === 0 || isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Mover slide para esquerda"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(slideIndex, slideIndex + 1)}
                        disabled={slideIndex === plan.slides.length - 1 || isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Mover slide para direita"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateSlide(slideIndex)}
                        disabled={isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Duplicar slide"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => addSlide(slideIndex)}
                        disabled={isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-newTableBorder text-textItemBlur transition hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Adicionar slide após este"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlide(slideIndex)}
                        disabled={plan.slides.length <= 1 || isLoading}
                        className="flex items-center justify-center h-7 w-7 rounded-[6px] border border-red-500/30 text-red-400 transition hover:border-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Remover slide"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isLoading && <IndeterminateBar />}

                  <div className="flex flex-wrap gap-[8px]">
                    <button
                      type="button"
                      onClick={() => regenerateSlideCopy(slide, 'copy')}
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Regenerar copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'estilo')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Variar estilo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'direto')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais direto
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'premium')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais premium
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'provocativo')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais provocativo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'marca')
                      }
                      disabled={!!slideLoading[slide.index]}
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
                        !!slideLoading[slide.index] ||
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
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Menos inspiração
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'espaco-texto')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Mais espaço p/ texto
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'metafora')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Trocar metáfora
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        regenerateSlideCopy(slide, 'manter-layout')
                      }
                      disabled={!!slideLoading[slide.index]}
                      className="rounded-[8px] border border-newTableBorder px-[10px] py-[7px] text-[12px] font-[600] hover:border-primary"
                    >
                      Manter layout
                    </button>
                  </div>

                  {!!slideHistory[slide.index]?.length && (
                    <div className="flex flex-wrap items-center gap-[8px] rounded-[10px] border border-newTableBorder bg-newBgColor p-[10px]">
                      <span className="text-[12px] font-[700] text-textItemBlur">
                        Histórico:
                      </span>
                      {slideHistory[slide.index].map((_, historyIndex) => (
                        <button
                          key={`${slide.index}-history-${historyIndex}`}
                          type="button"
                          onClick={() =>
                            restoreSlideVersion(slide.index, historyIndex)
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
                          slide.index,
                          'headline',
                          event.target.value
                        )
                      }
                      className={`${textAreaClass} min-h-[72px] text-[16px] font-[700]`}
                    />
                  </label>

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      Texto de apoio na imagem
                    </span>
                    <textarea
                      value={slide.body}
                      onChange={(event) =>
                        updateSlide(
                          slide.index,
                          'body',
                          event.target.value
                        )
                      }
                      className={`${textAreaClass} min-h-[80px]`}
                    />
                  </label>

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      CTA ou selo pequeno na imagem
                    </span>
                    <input
                      value={slide.cta}
                      onChange={(event) =>
                        updateSlide(
                          slide.index,
                          'cta',
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="flex flex-col gap-[6px]">
                    <span className="text-[13px] font-[600]">
                      Direção visual do slide
                    </span>
                    <textarea
                      value={slide.imagePrompt}
                      onChange={(event) =>
                        updateSlide(
                          slide.index,
                          'imagePrompt',
                          event.target.value
                        )
                      }
                      className={`${textAreaClass} min-h-[80px]`}
                    />
                  </label>
                </div>

                <div className="w-full md:w-[280px] flex-shrink-0 flex flex-col gap-[12px]">
                  <div className="flex items-center justify-between gap-[8px]">
                    <span className="text-[13px] font-[600]">
                      Imagem Gerada
                    </span>
                    <button
                      type="button"
                      onClick={() => generateSlideImage(slide)}
                      disabled={
                        !!slideLoading[slide.index] ||
                        !trimmedImageModel
                      }
                      className="flex items-center gap-[6px] rounded-[8px] border border-newTableBorder px-[9px] py-[6px] text-[12px] font-[600] hover:border-primary disabled:opacity-60"
                    >
                      {loadingImage && <Spinner size={12} />}
                      {loadingImage ? 'Gerando...' : 'Regenerar imagem'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <input
                      value={slideImageAdjustments[slide.index] || ''}
                      onChange={(event) =>
                        setSlideImageAdjustment(slide.index, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          if (
                            !slideLoading[slide.index] &&
                            trimmedImageModel
                          ) {
                            generateSlideImage(slide);
                          }
                        }
                      }}
                      placeholder="Ajuste rápido: ex. mais escuro, menos texto…"
                      disabled={!!slideLoading[slide.index]}
                      className={`${inputClass} text-[12px]`}
                    />
                    <span className="text-[11px] text-textItemBlur">
                      Descreva o ajuste e clique em “Regenerar imagem” (ou Enter)
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
                  {!!slideImageHistory[slide.index]?.length && (
                    <div className="flex flex-wrap items-center gap-[7px] rounded-[10px] border border-newTableBorder bg-newBgColor p-[9px]">
                      <span className="text-[11px] font-[700] text-textItemBlur">
                        Imagens antigas:
                      </span>
                      {slideImageHistory[slide.index].map(
                        (_, historyIndex) => (
                          <button
                            key={`${slide.index}-image-history-${historyIndex}`}
                            type="button"
                            onClick={() =>
                              restoreImageVersion(
                                slide.index,
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { imageSrc } from './ai-generate-images.utils';
import { Spinner } from './ai-generate-images.loaders';
import type {
  CarouselPlan,
  CarouselTemplate,
  EditorialIssue,
  SlideImageResult,
} from './ai-generate-images.types';

type CarouselPreviewPanelProps = {
  activePreview: number;
  brandName: string;
  editorialIssues: EditorialIssue[];
  generatingImages: boolean;
  plan: CarouselPlan;
  platform: string;
  setActivePreview: (index: number) => void;
  setLightboxIndex: (index: number) => void;
  slideImages: Record<number, SlideImageResult>;
  template: CarouselTemplate;
};

export function CarouselPreviewPanel(props: CarouselPreviewPanelProps) {
  const {
    activePreview,
    brandName,
    editorialIssues,
    generatingImages,
    plan,
    platform,
    setActivePreview,
    setLightboxIndex,
    slideImages,
    template,
  } = props;

  return (
    <>
    <div className="rounded-[20px] bg-newBgColor border border-newTableBorder shadow-sm p-[24px]">
      <div className="mb-[16px] flex items-center justify-between gap-[12px]">
        <div>
          <h3 className="text-[20px] font-[700]">
            Preview do carrossel
          </h3>
          <p className="text-[14px] text-textItemBlur">
            Visualize a sequência no formato final antes de gerar ou
            regenerar imagens.
          </p>
        </div>
        <div className="hidden rounded-[10px] border border-newTableBorder px-[12px] py-[8px] text-[12px] text-textItemBlur md:block">
          {platform === 'linkedin' ? '1:1 LinkedIn' : '1:1 Instagram'}
        </div>
      </div>

      <div className="flex gap-[14px] overflow-x-auto pb-[8px]">
        {plan.slides.map((slide, index) => {
          const src = imageSrc(slideImages[slide.index]?.image);
          const pending = generatingImages && !src && !slideImages[slide.index]?.error;

          return (
            <button
              key={`preview-${slide.index}`}
              type="button"
              onClick={() => {
                setActivePreview(index);
                if (src) setLightboxIndex(index);
              }}
              className={`relative aspect-square w-[230px] shrink-0 overflow-hidden rounded-[12px] border text-left transition ${
                pending
                  ? 'border-primary/60'
                  : activePreview === index
                  ? 'border-primary'
                  : 'border-newTableBorder'
              }`}
            >
              {src ? (
                <img
                  src={src}
                  alt={slide.altText}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#f7f7f2,#d7dde8)]" />
              )}
              <div className="absolute inset-0 bg-black/25" />
              {pending && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[8px] bg-black/45 backdrop-blur-[1px]">
                  <Spinner size={24} className="text-white" />
                  <span className="text-[11px] font-[800] uppercase tracking-[0.12em] text-white/90">
                    Gerando
                  </span>
                </div>
              )}
              <div className="relative flex h-full flex-col justify-between p-[18px] text-white">
                <div className="flex items-center justify-between text-[11px] font-[700] uppercase tracking-[0.08em]">
                  <span>{brandName.trim() || template.label}</span>
                  <span>
                    {slide.index}/{plan.slides.length}
                  </span>
                </div>
                <div>
                  <div className="text-[22px] font-[800] leading-[26px]">
                    {slide.headline}
                  </div>
                  {slide.body && (
                    <div className="mt-[10px] max-h-[52px] overflow-hidden text-[12px] font-[500] leading-[17px] text-white/85">
                      {slide.body}
                    </div>
                  )}
                </div>
                {slide.cta && (
                  <div className="w-fit rounded-full bg-white px-[10px] py-[5px] text-[11px] font-[700] text-black">
                    {slide.cta}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>

    {editorialIssues.length > 0 && (
      <div className="rounded-[16px] border border-yellow-500/30 bg-yellow-500/10 p-[16px]">
        <div className="mb-[8px] text-[15px] font-[700] text-yellow-200">
          Checagem editorial
        </div>
        <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2">
          {editorialIssues.slice(0, 6).map((issue, index) => (
            <div
              key={`${issue.slide}-${issue.label}-${index}`}
              className="text-[13px] text-yellow-100"
            >
              Slide {issue.slide}: {issue.label}
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}

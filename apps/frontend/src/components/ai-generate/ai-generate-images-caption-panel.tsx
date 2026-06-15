import { useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';

import { textAreaClass } from './ai-generate-images.constants';
import { Spinner } from './ai-generate-images.loaders';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
];

type CaptionPanelProps = {
  platform: string;
  captionPlatform: string;
  caption: string;
  hashtags: string[];
  loading: boolean;
  error: string;
  onGenerate: (platform: string) => void;
  onCaptionChange: (value: string) => void;
};

export function CaptionPanel(props: CaptionPanelProps) {
  const {
    platform,
    captionPlatform,
    caption,
    hashtags,
    loading,
    error,
    onGenerate,
    onCaptionChange,
  } = props;

  const [copied, setCopied] = useState(false);

  const fullText = [caption, hashtags.join(' ')].filter(Boolean).join('\n\n');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard pode falhar sem HTTPS/permite; ignora silenciosamente.
    }
  };

  return (
    <div className="rounded-[18px] border border-black/10 bg-white p-[28px] shadow-sm dark:border-white/10 dark:bg-[#101010]">
      <div className="mb-[16px] flex items-start gap-[12px]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-500/20 bg-stone-500/10 text-[15px] font-[900] text-stone-800 dark:text-stone-100">
          <Sparkles className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h3 className="text-[22px] font-[800] text-black dark:text-white">
            Legenda do post
          </h3>
          <p className="mt-[4px] text-[14px] leading-relaxed text-black/60 dark:text-white/60">
            Gere a legenda e as hashtags adaptadas para cada rede — pronto para copiar e publicar.
          </p>
        </div>
      </div>

      <div className="mb-[14px] flex flex-wrap gap-[8px]">
        {PLATFORMS.map((item) => {
          const active = (captionPlatform || platform) === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onGenerate(item.value)}
              disabled={loading}
              className={`flex items-center gap-[8px] rounded-[10px] border px-[14px] py-[9px] text-[13px] font-[800] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
                  : 'border-black/10 bg-white text-black/70 hover:border-stone-500/40 hover:bg-stone-50 dark:border-white/15 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'
              }`}
            >
              {loading && captionPlatform === item.value && <Spinner size={14} />}
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-[12px] rounded-[12px] border border-red-500/30 bg-red-500/10 px-[14px] py-[10px] text-[13px] font-[600] text-red-500 dark:text-red-300">
          {error}
        </div>
      )}

      {!caption && !loading && (
        <p className="text-[13px] text-black/50 dark:text-white/50">
          Escolha uma rede acima para gerar a legenda do post.
        </p>
      )}

      {(caption || loading) && (
        <div className="flex flex-col gap-[12px]">
          <textarea
            value={caption}
            onChange={(event) => onCaptionChange(event.target.value)}
            placeholder={loading ? 'Gerando legenda...' : ''}
            className={`${textAreaClass} min-h-[150px] text-[14px] leading-relaxed`}
          />

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-[6px]">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/10 bg-black/[0.03] px-[10px] py-[5px] text-[12px] font-[700] text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={copyAll}
              disabled={!fullText}
              className="flex items-center gap-[8px] rounded-[10px] border border-black/10 bg-white px-[14px] py-[9px] text-[13px] font-[800] text-black/80 transition hover:bg-stone-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              {copied ? <Check className="h-[15px] w-[15px]" /> : <Copy className="h-[15px] w-[15px]" />}
              {copied ? 'Copiado!' : 'Copiar legenda + hashtags'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

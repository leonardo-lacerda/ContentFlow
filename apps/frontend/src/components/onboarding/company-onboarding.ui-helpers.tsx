'use client';

import { ReactNode, useState } from 'react';
import { X } from 'lucide-react';
import { listToArray, arrayToList } from './company-onboarding.types';

export const OptionChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-[14px] py-[9px] text-[13px] font-[700] transition ${
      active
        ? 'border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900'
        : 'border-black/10 bg-white/70 text-black/65 hover:border-stone-500/50 hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-stone-100'
    }`}
  >
    {children}
  </button>
);

export const TagInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) => {
  const [draft, setDraft] = useState('');
  const tags = listToArray(value);

  const add = (raw: string) => {
    const item = raw.trim().replace(/,$/, '').trim();
    if (!item || tags.includes(item)) {
      setDraft('');
      return;
    }
    onChange(arrayToList([...tags, item]));
    setDraft('');
  };

  const remove = (tag: string) =>
    onChange(arrayToList(tags.filter((item) => item !== tag)));

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex min-h-[48px] flex-wrap items-center gap-[8px] rounded-[10px] border border-black/10 bg-white p-[8px] dark:border-white/10 dark:bg-[#171717]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-[6px] rounded-full bg-stone-900/10 px-[10px] py-[5px] text-[12px] font-[700] text-black/80 dark:bg-white/10 dark:text-white/80"
          >
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remover ${tag}`}>
              <X className="h-[12px] w-[12px]" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            } else if (event.key === 'Backspace' && !draft && tags.length) {
              remove(tags[tags.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          placeholder={tags.length ? '' : placeholder}
          className="min-w-[120px] flex-1 bg-transparent px-[6px] text-[14px] text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/35"
        />
      </div>
    </div>
  );
};

export const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col gap-[4px]">
    <h3 className="text-[22px] font-[800] tracking-tight text-black dark:text-white">{title}</h3>
    <p className="text-[14px] leading-relaxed text-black/55 dark:text-white/55">{subtitle}</p>
  </div>
);

export const FieldLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-[14px] font-[700] text-black/90 dark:text-white/90">{children}</span>
);

'use client';

import { useRouter } from 'next/navigation';
import { Megaphone, Mail, Clapperboard } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { buildAmpliarUrl } from './build-ampliar-url';
import type { AmpliarSource, AmpliarTarget } from './ampliar.types';

type Props = AmpliarSource & {
  compact?: boolean;
  className?: string;
  /** Esconde um target específico */
  hide?: AmpliarTarget[];
};

const ITEMS: {
  target: AmpliarTarget;
  label: string;
  icon: typeof Megaphone;
}[] = [
  { target: 'ads', label: 'Anúncio', icon: Megaphone },
  { target: 'email', label: 'E-mail', icon: Mail },
  { target: 'video', label: 'Roteiro', icon: Clapperboard },
];

/**
 * CTAs Ampliar: leva ideia/carrossel para ads, e-mail ou roteiro de vídeo.
 */
export function AmpliarActions({
  compact,
  className,
  hide = [],
  ...source
}: Props) {
  const router = useRouter();

  const go = (target: AmpliarTarget) => {
    router.push(buildAmpliarUrl(target, { from: source.from || 'swipe', ...source }));
  };

  const visible = ITEMS.filter((i) => !hide.includes(i.target));

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap ${className || ''}`}>
        <span className="text-[11px] text-textItemBlur mr-1 uppercase tracking-wide font-semibold">
          Ampliar
        </span>
        {visible.map(({ target, label, icon: Icon }) => (
          <Button
            key={target}
            secondary
            className="!h-[32px] !px-2.5 !text-xs"
            onClick={() => go(target)}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`rounded-[12px] border border-newTableBorder bg-newBgColorInner p-3 ${className || ''}`}
    >
      <div className="text-[12px] font-semibold text-newTextColor mb-2">
        Ampliar com IA
      </div>
      <p className="text-[11px] text-textItemBlur mb-3">
        A IA sugere o melhor formato e gera anúncio, e-mail ou roteiro com o DNA —
        sem você montar brief.
      </p>
      <div className="flex flex-wrap gap-2">
        {visible.map(({ target, label, icon: Icon }) => (
          <Button
            key={target}
            secondary
            className="!h-[36px] !px-3"
            onClick={() => go(target)}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

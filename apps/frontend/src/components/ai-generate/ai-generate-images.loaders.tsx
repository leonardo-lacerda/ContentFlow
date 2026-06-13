'use client';

import { useEffect, useState } from 'react';

type SpinnerProps = {
  size?: number;
  className?: string;
};

/**
 * Anel giratório simples. Usa a cor do texto (border-current) para herdar
 * o tom do contexto onde for usado.
 */
export function Spinner({ size = 18, className = '' }: SpinnerProps) {
  const borderWidth = Math.max(2, Math.round(size / 9));

  return (
    <span
      role="status"
      aria-label="Carregando"
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent ${className}`}
      style={{ width: size, height: size, borderWidth }}
    />
  );
}

/**
 * Três pontinhos pulsando — para acompanhar um texto de "aguarde".
 */
export function AnimatedDots({ className = '' }: { className?: string }) {
  return (
    <span className={`ml-[3px] inline-flex items-end gap-[3px] ${className}`}>
      <span className="h-[4px] w-[4px] animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-[4px] w-[4px] animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-[4px] w-[4px] animate-bounce rounded-full bg-current" />
    </span>
  );
}

/**
 * Barra indeterminada (pulsa) para indicar processamento em andamento
 * sem percentual conhecido.
 */
export function IndeterminateBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-[4px] w-full overflow-hidden rounded-full bg-primary/15 ${className}`}
    >
      <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
    </div>
  );
}

const PLAN_STEPS = [
  'Analisando o contexto da empresa e o tema...',
  'Estruturando o roteiro dos slides...',
  'Escrevendo headlines e textos de apoio...',
  'Definindo a direção visual de cada imagem...',
  'Revisando a copy do carrossel...',
];

/**
 * Estado de carregamento exibido enquanto a IA monta o plano do carrossel.
 * Mostra mensagens rotativas + esqueleto dos slides para o usuário não ficar
 * no escuro durante a espera (que pode levar alguns segundos).
 */
export function PlanGeneratingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % PLAN_STEPS.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-busy="true"
      className="rounded-[18px] border border-black/10 bg-white p-[32px] shadow-sm dark:border-white/10 dark:bg-[#101010]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
          <Spinner size={20} />
        </span>
        <div>
          <h3 className="text-[20px] font-[800] text-black dark:text-white">
            Gerando seu carrossel
          </h3>
          <p className="mt-[2px] flex items-center text-[14px] text-black/60 dark:text-white/60">
            {PLAN_STEPS[step]}
            <AnimatedDots className="text-primary" />
          </p>
        </div>
      </div>

      <div className="mt-[20px]">
        <IndeterminateBar />
      </div>

      <div className="mt-[24px] flex gap-[14px] overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square w-[160px] shrink-0 animate-pulse rounded-[12px] border border-newTableBorder bg-newBgColorInner"
            style={{ animationDelay: `${index * 0.12}s` }}
          >
            <div className="flex h-full flex-col justify-between p-[14px]">
              <div className="h-[10px] w-1/2 rounded-full bg-black/10 dark:bg-white/10" />
              <div className="space-y-[8px]">
                <div className="h-[14px] w-3/4 rounded-full bg-black/15 dark:bg-white/15" />
                <div className="h-[10px] w-2/3 rounded-full bg-black/10 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Sobreposição de "aguarde" para os quadros de imagem (gerando/regerando).
 */
export function SlideMediaLoading({
  label = 'Gerando imagem',
}: {
  label?: string;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[10px] rounded-[12px] bg-newBgColor/85 text-textItemBlur backdrop-blur-[2px]">
      <Spinner size={28} className="text-primary" />
      <span className="flex items-center text-[12px] font-[700] tracking-wide text-textPrimary">
        {label}
        <AnimatedDots className="text-primary" />
      </span>
    </div>
  );
}

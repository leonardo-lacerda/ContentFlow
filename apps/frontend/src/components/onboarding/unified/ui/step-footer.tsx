'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export function StepFooter({
  onBack,
  onNext,
  onSkip,
  nextLabel,
  skipLabel,
  loading,
  nextDisabled,
  hideNext,
  hideSkip,
}: {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  skipLabel?: string;
  loading?: boolean;
  nextDisabled?: boolean;
  hideNext?: boolean;
  hideSkip?: boolean;
}) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-2 border-t border-newTableBorder">
      <div>
        {onBack ? (
          <Button onClick={onBack} secondary disabled={loading}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back', 'Voltar')}
          </Button>
        ) : (
          <span />
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSkip && !hideSkip ? (
          <Button onClick={onSkip} secondary disabled={loading}>
            {skipLabel || t('onboarding_skip_step', 'Pular etapa')}
          </Button>
        ) : null}
        {onNext && !hideNext ? (
          <Button onClick={onNext} loading={loading} disabled={nextDisabled}>
            {nextLabel || t('next', 'Próximo')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
